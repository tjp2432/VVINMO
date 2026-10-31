// Baja TODAS las fotos de cada aviso publicado en la página de la inmobiliaria
// en ZonaProp y las guarda en el catálogo local (react-app/public/propiedades/<id>).
//
// Uso (desde react-app/server):
//   node prisma/importar-fotos-zonaprop.js             -> actualiza las propiedades existentes
//   node prisma/importar-fotos-zonaprop.js --agregar   -> además crea (como borrador) los avisos que faltan
//   node prisma/importar-fotos-zonaprop.js --dry-run   -> solo informa, no escribe nada
//   node prisma/importar-fotos-zonaprop.js --tamano 1600x1200
//
// ZonaProp no tiene API pública: el listado y las fichas se piden como navegador
// (curl con user-agent) y las fotos salen del CDN (imgar.zonapropcdn.com).
//
// Cada propiedad se asocia por el ID del aviso que ya está guardado en
// external_link (…-59880962.html -> 59880962). Los avisos que no están en el
// catálogo se informan al final; con --agregar se crean como borrador con los
// datos de la ficha para revisarlos en /admin antes de publicarlos.
import 'dotenv/config';
import { execFileSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const AGENCIA =
  'https://www.zonaprop.com.ar/inmobiliarias/veronica-villafane-inmobiliaria-integral_30466914-inmuebles.html';

const UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Probamos de mayor a menor calidad; ZonaProp sirve hasta 1600x1200.
const TAMANOS = ['1600x1200', '1200x900', '720x532'];

const DRY = process.argv.includes('--dry-run');
const AGREGAR = process.argv.includes('--agregar');
const argTamano = (() => {
  const i = process.argv.indexOf('--tamano');
  return i !== -1 ? process.argv[i + 1] : null;
})();

const destino = path.resolve(process.cwd(), '..', 'public', 'propiedades');

// ---------------------------------------------------------------------------
// Descarga de HTML y fotos
// ---------------------------------------------------------------------------
function bajarHtml(url) {
  // curl imita mejor a un navegador que fetch (ZonaProp responde 403 a fetch).
  return execFileSync(
    'curl',
    ['-sS', '-L', '--max-time', '40', '-A', UA, '-H', 'Accept-Language: es-AR,es;q=0.9', url],
    { maxBuffer: 64 * 1024 * 1024, encoding: 'utf8' },
  );
}

function linksDelListado(html) {
  const set = new Set();
  for (const m of html.matchAll(/href="(\/propiedades\/clasificado\/[^"?]+\.html)/g)) {
    set.add(m[1]);
  }
  return [...set];
}

function idDeUrl(url) {
  return (url.match(/-(\d+)\.html$/) || [])[1] || null;
}

function fotosDelHtml(html) {
  const re =
    /https?:\/\/imgar\.zonapropcdn\.com\/(avisos\/[^"'\s\\]+?)\/\d+x\d+\/(\d+)\.(?:jpg|jpeg|webp)/g;
  const vistos = new Set();
  const fotos = [];
  let m;
  while ((m = re.exec(html))) {
    if (vistos.has(m[2])) continue;
    vistos.add(m[2]);
    fotos.push({ base: m[1], id: m[2] });
  }
  return fotos;
}

async function bajarFoto(foto, archivo) {
  const variantes = argTamano ? [argTamano] : TAMANOS;
  for (const t of variantes) {
    const url = `https://imgar.zonapropcdn.com/${foto.base}/${t}/${foto.id}.jpg`;
    const res = await fetch(url, {
      headers: { 'user-agent': UA, referer: 'https://www.zonaprop.com.ar/' },
    });
    if (!res.ok) continue;
    const tipo = res.headers.get('content-type') || '';
    if (!tipo.startsWith('image/')) continue;
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 2000) continue;
    fs.writeFileSync(archivo, buf);
    return { bytes: buf.length, tamano: t };
  }
  return null;
}

// Guarda todas las fotos del aviso y devuelve las rutas públicas.
async function guardarFotos(zp, fotos) {
  const carpeta = path.join(destino, zp);
  const rutas = [];
  if (!DRY) fs.mkdirSync(carpeta, { recursive: true });

  for (const [i, foto] of fotos.entries()) {
    const nombre = `${String(i + 1).padStart(2, '0')}.jpg`;
    const archivo = path.join(carpeta, nombre);
    rutas.push(`/propiedades/${zp}/${nombre}`);

    if (DRY) continue;
    if (fs.existsSync(archivo) && fs.statSync(archivo).size > 2000) continue;
    await bajarFoto(foto, archivo);
  }

  if (!DRY) {
    // Borrar sobrantes de importaciones anteriores (01.jpg … NN.jpg)
    for (const f of fs.readdirSync(carpeta)) {
      const m = f.match(/^(\d+)\.jpg$/);
      if (m && Number(m[1]) > fotos.length) fs.rmSync(path.join(carpeta, f), { force: true });
    }
  }
  return { rutas, carpeta };
}

// ---------------------------------------------------------------------------
// Lectura de los datos de la ficha
// ---------------------------------------------------------------------------
const ENTIDADES = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', sup2: '²', sup3: '³',
  aacute: 'á', eacute: 'é', iacute: 'í', oacute: 'ó', uacute: 'ú', ntilde: 'ñ',
  Aacute: 'Á', Eacute: 'É', Iacute: 'Í', Oacute: 'Ó', Uacute: 'Ú', Ntilde: 'Ñ',
  ordm: 'º', deg: '°', middot: '·', raquo: '»', laquo: '«', hellip: '…',
};

function decodificar(texto = '') {
  return texto
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(Number(d)))
    .replace(/&([a-z][a-z0-9]*);/gi, (m, n) => ENTIDADES[n] ?? m);
}

function textoPlano(html = '') {
  return decodificar(
    String(html)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|li|h\d)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

const TIPOS = {
  departamento: 'departamento',
  casa: 'casa',
  ph: 'ph',
  oficina: 'oficina',
  local: 'local',
  terreno: 'terreno',
  cochera: 'cochera',
  galpón: 'local',
  galpon: 'local',
  bodega: 'local',
  depósito: 'local',
  deposito: 'local',
};

function numero(valor) {
  if (valor === undefined || valor === null) return null;
  const n = Number(String(valor).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) ? n : null;
}

// Los precios vienen con puntos de miles ("1.800.000"): se descarta todo lo
// que no sea dígito antes de convertirlos.
function monto(valor) {
  if (valor === undefined || valor === null) return null;
  const n = Number(String(valor).replace(/\D/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function conMiles(n) {
  return n === null || n === undefined ? null : new Intl.NumberFormat('es-AR').format(n);
}

function datosDeAviso(html, url, zp) {
  const uno = (re) => {
    const m = html.match(re);
    return m ? m[1] : '';
  };

  // Bloque de datos que ZonaProp deja en la ficha (objeto JS con comillas simples)
  let main = {};
  let general = {};
  try { main = JSON.parse(uno(/'mainFeatures'\s*:\s*(\{[\s\S]*?\}),\s*\n/)); } catch { /* sin medidas */ }
  try { general = JSON.parse(uno(/'generalFeatures'\s*:\s*(\{[\s\S]*?\}),\s*\n/)); } catch { /* sin características */ }

  const medida = (etiqueta) => {
    const f = Object.values(main).find((x) => (x.label || '').startsWith(etiqueta));
    return f ? numero(f.value) : null;
  };

  let direccion = '';
  try {
    const bloque = uno(/'address'\s*:\s*(\{[^\n]*?\})/);
    if (bloque) direccion = JSON.parse(bloque).name || '';
  } catch { /* dirección no visible */ }

  const barrio = uno(/'neighborhood'\s*:\s*'([^']*)'/) || uno(/"name":"([^"]+)","label":"BARRIO"/);

  const op = (uno(/'operationType'\s*:\s*'([^']*)'/) || '').toLowerCase();
  const tipoZona = uno(/'propertyType'\s*:\s*'([^']*)'/).toLowerCase();

  const precioCrudo = uno(/'price'\s*:\s*'([^']*)'/);
  const esUsd = /usd|u\$s/i.test(precioCrudo);
  const montoPrecio = monto(precioCrudo.replace(/usd/gi, ''));

  const expensas = monto(uno(/'expenses'\s*:\s*'([^']*)'/));

  const titulo =
    textoPlano(uno(/'postingTitle'\s*:\s*"([^"]*)"/)) ||
    textoPlano(uno(/"name"\s*:\s*"([^"]+)"/)).replace(/\s*-\s*Zonaprop$/i, '');

  let descripcion = '';
  try {
    const crudo = uno(/'description'\s*:\s*"([\s\S]*?)"\s*,\s*\n/);
    if (crudo) descripcion = textoPlano(JSON.parse(`"${crudo}"`));
  } catch { /* sin descripción */ }

  // Características: se descartan las meramente edilicias y se agregan las
  // cualidades de la ficha (disposición, luminosidad, orientación, antigüedad).
  const features = [];
  const agregar = (txt) => {
    const t = textoPlano(txt);
    if (t && !features.includes(t) && features.length < 14) features.push(t);
  };
  for (const [grupo, items] of Object.entries(general)) {
    if (/características generales/i.test(grupo)) continue;
    for (const it of Object.values(items)) {
      if (it.value) agregar(`${it.label}: ${it.value}`);
      else agregar(it.label);
    }
  }
  for (const f of Object.values(main)) {
    if (['Disposición', 'Luminosidad', 'Orientación', 'antigüedad'].includes(f.label)) {
      if (f.label === 'antigüedad') agregar(`${f.value} años de antigüedad`);
      else agregar(f.label === 'Orientación' ? `Orientación ${f.value}` : f.value);
    }
  }

  return {
    title: titulo || `Aviso ${zp}`,
    description: descripcion || null,
    address: direccion || 'Consultar dirección',
    neighborhood: barrio || null,
    city: 'CABA',
    price: montoPrecio === null ? 'Consultar' : conMiles(montoPrecio),
    currency: esUsd ? 'USD' : 'ARS',
    expenses: expensas === null ? null : `$ ${conMiles(expensas)}`,
    type: op === 'venta' ? 'venta' : 'alquiler',
    property_type: TIPOS[tipoZona] || 'departamento',
    status: 'disponible',
    rooms: medida('amb.'),
    bedrooms: medida('dorm.'),
    bathrooms: medida('baño'),
    garage: medida('coch.'),
    area_m2: medida('tot.'),
    area_covered_m2: medida('cub.'),
    features: JSON.stringify(features),
    external_link: url,
    featured: false,
    published: false,
  };
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n🖼  Importando fotos desde ZonaProp${DRY ? '  (simulación: no escribe)' : ''}${AGREGAR ? '  (+ alta de avisos nuevos)' : ''}\n`);
  console.log('  Listado de la inmobiliaria…');
  const htmlListado = bajarHtml(AGENCIA);
  const links = linksDelListado(htmlListado);
  console.log(`  ${links.length} avisos publicados\n`);

  if (!links.length) throw new Error('No se encontraron avisos en el listado (¿cambió el HTML?)');

  const propiedades = await prisma.property.findMany({
    select: { id: true, title: true, external_link: true, images: true },
  });
  const porAviso = new Map();
  for (const p of propiedades) {
    const zp = p.external_link ? idDeUrl(p.external_link) : null;
    if (zp) porAviso.set(zp, p);
  }

  const resumen = { actualizadas: 0, creadas: 0, fotos: 0, errores: 0 };
  const sinCatalogo = [];
  const sinFotos = [];

  for (const [n, link] of links.entries()) {
    const zp = idDeUrl(link);
    const url = 'https://www.zonaprop.com.ar' + link;
    const prefijo = `  [${String(n + 1).padStart(2)}/${links.length}] ${zp}`;

    let html;
    try {
      html = bajarHtml(url);
    } catch {
      resumen.errores++;
      console.log(`${prefijo}  ✗ no se pudo abrir el aviso`);
      continue;
    }

    const fotos = fotosDelHtml(html);
    const prop = porAviso.get(zp);

    if (!prop && !AGREGAR) {
      sinCatalogo.push({ zp, fotos: fotos.length, ...datosDeAviso(html, url, zp) });
      console.log(`${prefijo}  — no está en el catálogo (${fotos.length} fotos)`);
      continue;
    }

    if (!fotos.length) {
      sinFotos.push(prop || { title: `aviso ${zp}` });
      console.log(`${prefijo}  ${prop ? prop.title : 'aviso nuevo'} → sin fotos en el aviso`);
      continue;
    }

    const { rutas } = await guardarFotos(zp, fotos);
    resumen.fotos += fotos.length;

    if (!DRY) {
      if (prop) {
        await prisma.property.update({
          where: { id: prop.id },
          data: { images: JSON.stringify(rutas) },
        });
        resumen.actualizadas++;
        console.log(`${prefijo}  ${prop.title} → ${fotos.length} fotos`);
      } else {
        const datos = datosDeAviso(html, url, zp);
        const nueva = await prisma.property.create({
          data: { ...datos, images: JSON.stringify(rutas) },
        });
        await prisma.auditLog.create({
          data: { action: 'CREATE_PROPERTY_ZONAPROP', entity: 'Property', entity_id: nueva.id },
        });
        resumen.creadas++;
        console.log(`${prefijo}  + borrador "${nueva.title}" (${fotos.length} fotos) → revisar en /admin`);
      }
    } else {
      const d = prop ? null : datosDeAviso(html, url, zp);
      const quien = prop ? prop.title : `borrador: ${d.title} · ${d.address} · ${d.price} ${d.currency}`;
      console.log(`${prefijo}  ${quien} → ${fotos.length} fotos`);
    }
  }

  const idsPublicados = new Set(links.map(idDeUrl));
  const sinAviso = propiedades.filter((p) => {
    const zp = p.external_link ? idDeUrl(p.external_link) : null;
    return !zp || !idsPublicados.has(zp);
  });

  console.log('\n────────────────────────────────────────');
  console.log(`Propiedades actualizadas: ${resumen.actualizadas}`);
  if (AGREGAR) console.log(`Propiedades creadas (borrador): ${resumen.creadas}`);
  console.log(`Fotos ${DRY ? 'a importar' : 'importadas'}: ${resumen.fotos}`);
  if (resumen.errores) console.log(`Errores: ${resumen.errores}`);
  if (sinFotos.length) console.log(`Avisos sin fotos: ${sinFotos.length}`);

  if (sinAviso.length) {
    console.log(`\nEn el catálogo pero ya no publicadas en ZonaProp (${sinAviso.length}):`);
    for (const p of sinAviso) console.log(`  · ${p.title}`);
  }

  if (sinCatalogo.length) {
    console.log(`\nPublicadas en ZonaProp pero fuera del catálogo (${sinCatalogo.length}):`);
    for (const p of sinCatalogo) {
      console.log(`  · ${p.zp}  ${p.title.slice(0, 70)}`);
      console.log(`            ${p.address} · ${p.price} ${p.currency} · ${p.fotos} fotos`);
    }
    console.log('\n  Corré con --agregar para crearlas como borrador con sus fotos.');
  }

  if (DRY) console.log('\n(simulación: no se escribió nada)');
  console.log('');
}

main()
  .catch((e) => {
    console.error('\nError:', e.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
