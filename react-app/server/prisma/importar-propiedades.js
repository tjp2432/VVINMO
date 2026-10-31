// Importa a la base las propiedades que antes estaban hardcodeadas en el
// frontend (src/data/propiedades.js). Se puede correr varias veces: saltea las
// que ya existen (mismo título + dirección).
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PROPIEDADES, LISTADO, getPhotos } from './seed-propiedades-data.js';

const prisma = new PrismaClient();

function separarPrecio(txt) {
  const s = String(txt || '').trim();
  const esUsd = /USD/i.test(s);
  const numero = s.replace(/USD/gi, '').replace(/\$/g, '').trim();
  return { currency: esUsd ? 'USD' : 'ARS', price: numero || s };
}

function tipoDe(title = '') {
  const t = title.toLowerCase();
  if (t.includes('oficina')) return 'oficina';
  if (t.includes('ph')) return 'ph';
  if (t.includes('chalet') || t.includes('casa')) return 'casa';
  if (t.includes('local')) return 'local';
  if (t.includes('terreno')) return 'terreno';
  if (t.includes('cochera')) return 'cochera';
  return 'departamento';
}

const num = (match) => (match ? Number(String(match[1]).replace('.', '')) : null);

function medidas(features = []) {
  const texto = features.join(' · ');
  const buscar = (re) => num(texto.match(re));
  return {
    area_m2: buscar(/([\d.]+)\s*m²\s*(?:tot|total)/i),
    area_covered_m2: buscar(/([\d.]+)\s*m²\s*cub/i),
    rooms: buscar(/(\d+)\s*amb/i),
    bedrooms: buscar(/(\d+)\s*dorm/i),
    bathrooms: buscar(/(\d+)\s*ba[ñn]o/i),
    garage: buscar(/(\d+)\s*coch/i) ?? (/coch/i.test(texto) ? 1 : null),
  };
}

function ubicacion(address = '') {
  const i = address.lastIndexOf(',');
  if (i === -1) return { address, neighborhood: null };
  const calle = address.slice(0, i).trim();
  const barrio = address.slice(i + 1).trim();
  // Si lo que sigue a la coma es un barrio (sin números), lo separamos.
  if (!/\d/.test(barrio)) return { address: calle, neighborhood: barrio };
  return { address, neighborhood: null };
}

async function main() {
  const destacadas = new Set((LISTADO || []).slice(0, 3).map(p => p.id));
  let creadas = 0;
  let actualizadas = 0;

  for (const [id, p] of Object.entries(PROPIEDADES)) {
    const { currency, price } = separarPrecio(p.price);
    const { address, neighborhood } = ubicacion(p.address);

    const existente = await prisma.property.findFirst({ where: { title: p.title, address } });

    const datos = {
      title: p.title,
      description: p.description || null,
      address,
      neighborhood,
      city: 'CABA',
      price,
      currency,
      expenses: p.expensas || null,
      type: p.operation === 'Venta' ? 'venta' : 'alquiler',
      property_type: tipoDe(p.title),
      status: 'disponible',
      ...medidas(p.features),
      features: JSON.stringify(p.features || []),
      images: JSON.stringify(getPhotos(id)),
      external_link: p.link || null,
      featured: destacadas.has(id),
      published: true,
    };

    if (existente) {
      await prisma.property.update({ where: { id: existente.id }, data: datos });
      actualizadas++;
      continue;
    }

    await prisma.property.create({ data: datos });
    creadas++;
  }

  const total = await prisma.property.count();
  console.log(`Importadas ${creadas} propiedades, actualizadas ${actualizadas}. Total en la base: ${total}.`);
}

main()
  .catch(e => { console.error(e); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
