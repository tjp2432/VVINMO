// Baja TODAS las fotos de cada aviso publicado en la página de la inmobiliaria
// en ZonaProp y las guarda en el catálogo local (react-app/public/propiedades/<id>).
//
// Uso (desde react-app/server):
//   node prisma/importar-fotos-zonaprop.js            -> descarga y actualiza la base
//   node prisma/importar-fotos-zonaprop.js --dry-run  -> solo informa, no escribe nada
//   node prisma/importar-fotos-zonaprop.js --tamano 1600x1200
//
// ZonaProp no tiene API pública: el listado y las fichas se piden como navegador
// (curl con user-agent) y las fotos salen del CDN (imgar.zonapropcdn.com).
//
// Cada propiedad se asocia por el ID del aviso que ya está guardado en
// external_link (…-59880962.html -> 59880962). Los avisos que no están en el
// catálogo se informan al final para decidir si se agregan.
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
const argTamano = (() => {
  const i = process.argv.indexOf('--tamano');
  return i !== -1 ? process.argv[i + 1] : null;
})();

const destino = path.resolve(process.cwd(), '..', 'public', 'propiedades');

// ---------------------------------------------------------------------------
// utilidades
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

function datosDeFicha(html) {
  const datos = {};
  const bloques = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  for (const b of bloques) {
    try {
      const j = JSON.parse(b[1]);
      if (!j['@type'] || ['WebSite', 'Organization'].includes(j['@type'])) continue;
      datos.title = j.name || datos.title;
      datos.description = j.description || datos.description;
      const a = j.address || {};
      datos.address = [a.streetAddress, a.addressLocality].filter(Boolean).join(', ') || datos.address;
      const o = j.offers || {};
      datos.price = o.price ? String(o.price) : datos.price;
      datos.currency = o.priceCurrency || datos.currency;
      datos.property_type = j['@type'] || datos.property_type;
    } catch {
      /* bloque que no es JSON válido: se ignora */
    }
  }
  return datos;
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

function idDePropiedad(externalLink) {
  return externalLink ? idDeUrl(externalLink) : null;
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  console.log(`\n🖼  Importando fotos desde ZonaProp${DRY ? '  (simulación: no escribe)' : ''}\n`);
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
    const zp = idDePropiedad(p.external_link);
    if (zp) porAviso.set(zp, p);
  }

  let actualizadas = 0;
  let fotosBajadas = 0;
  const sinCatalogo = [];
  const sinFotos = [];
  let errores = 0;

  for (const [n, link] of links.entries()) {
    const zp = idDeUrl(link);
    const prop = porAviso.get(zp);
    const prefijo = `  [${String(n + 1).padStart(2)}/${links.length}] ${zp}`;

    let html;
    try {
      html = bajarHtml('https://www.zonaprop.com.ar' + link);
    } catch {
      errores++;
      console.log(`${prefijo}  ✗ no se pudo abrir el aviso`);
      continue;
    }

    const fotos = fotosDelHtml(html);
    if (!prop) {
      sinCatalogo.push({ zp, fotos: fotos.length, ...datosDeFicha(html) });
      console.log(`${prefijo}  — no está en el catálogo (${fotos.length} fotos)`);
      continue;
    }
    if (!fotos.length) {
      sinFotos.push(prop);
      console.log(`${prefijo}  ${prop.title} → sin fotos en el aviso`);
      continue;
    }

    const carpeta = path.join(destino, zp);
    const rutas = [];

    if (!DRY) fs.mkdirSync(carpeta, { recursive: true });

    for (const [i, foto] of fotos.entries()) {
      const nombre = `${String(i + 1).padStart(2, '0')}.jpg`;
      const archivo = path.join(carpeta, nombre);
      rutas.push(`/propiedades/${zp}/${nombre}`);

      if (DRY) {
        fotosBajadas++;
        continue;
      }
      if (fs.existsSync(archivo) && fs.statSync(archivo).size > 2000) {
        fotosBajadas++;
        continue;
      }
      const r = await bajarFoto(foto, archivo);
      if (r) fotosBajadas++;
      else {
        errores++;
        console.warn(`      ✗ no se pudo bajar la foto ${foto.id}`);
      }
    }

    if (!DRY) {
      // Borrar sobrantes de importaciones anteriores (01.jpg … NN.jpg)
      for (const f of fs.readdirSync(carpeta)) {
        const m = f.match(/^(\d+)\.jpg$/);
        if (m && Number(m[1]) > fotos.length) fs.rmSync(path.join(carpeta, f), { force: true });
      }
      await prisma.property.update({
        where: { id: prop.id },
        data: { images: JSON.stringify(rutas) },
      });
    }

    actualizadas++;
    console.log(`${prefijo}  ${prop.title} → ${fotos.length} fotos`);
  }

  const sinAviso = propiedades.filter((p) => {
    const zp = idDePropiedad(p.external_link);
    return !zp || !links.some((l) => idDeUrl(l) === zp);
  });

  console.log('\n────────────────────────────────────────');
  console.log(`Propiedades actualizadas: ${actualizadas}`);
  console.log(`Fotos ${DRY ? 'a importar' : 'importadas'}: ${fotosBajadas}`);
  if (errores) console.log(`Errores: ${errores}`);
  if (sinFotos.length) console.log(`Avisos sin fotos: ${sinFotos.length}`);

  if (sinAviso.length) {
    console.log(`\nEn el catálogo pero ya no publicadas en ZonaProp (${sinAviso.length}):`);
    for (const p of sinAviso) console.log(`  · ${p.title}`);
  }

  if (sinCatalogo.length) {
    console.log(`\nPublicadas en ZonaProp pero fuera del catálogo (${sinCatalogo.length}):`);
    for (const p of sinCatalogo) {
      console.log(`  · ${p.zp}  ${(p.title || '').slice(0, 70)}`);
      console.log(`            ${p.address || 'sin dirección'} · ${p.price ? p.price + ' ' + (p.currency || '') : 'sin precio'} · ${p.fotos} fotos`);
    }
    console.log('\n  Para agregarlas: crearlas desde /admin y volver a correr este script.');
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
