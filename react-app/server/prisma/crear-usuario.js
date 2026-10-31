// Crea una cuenta (por defecto ADMIN) sin pasar por la web.
//
//   node prisma/crear-usuario.js --email yo@mail.com --password "MiClave123" \
//        --nombre "Verónica" --apellido "Villafañe" [--rol ADMIN] [--dni 30123456]
//
// El sitio no tiene registro publico: las cuentas se crean con este script.
import 'dotenv/config';
import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';
import { encrypt, sha256 } from '../src/utils/crypto.js';

const prisma = new PrismaClient();

function arg(nombre, def = null) {
  const i = process.argv.indexOf(`--${nombre}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

const email = (arg('email') || '').trim().toLowerCase();
const password = arg('password') || '';
const nombre = arg('nombre') || 'Administrador';
const apellido = arg('apellido') || '';
const rol = (arg('rol', 'ADMIN') || 'ADMIN').toUpperCase();
const dni = arg('dni') || String(Math.floor(10000000 + Math.random() * 89999999));

if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
  console.error('Falta --email valido. Ej: --email yo@mail.com');
  process.exit(1);
}
if (password.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres (--password).');
  process.exit(1);
}
if (!['ADMIN', 'PROPIETARIO', 'INQUILINO'].includes(rol)) {
  console.error('--rol debe ser ADMIN, PROPIETARIO o INQUILINO');
  process.exit(1);
}

const email_hash = sha256(email);

const existente = await prisma.user.findFirst({
  where: { OR: [{ email_hash }, { dni_hash: sha256(dni) }] },
});
if (existente) {
  console.error(`Ya existe una cuenta con ese email o DNI (${existente.role}).`);
  await prisma.$disconnect();
  process.exit(1);
}

const user = await prisma.user.create({
  data: {
    email,
    email_encrypted: encrypt(email),
    email_hash,
    password_hash: await argon2.hash(password, { type: argon2.argon2id }),
    role: rol,
    nombre,
    apellido,
    dni_encrypted: encrypt(dni),
    dni_hash: sha256(dni),
    dni_last4: dni.slice(-4),
    sexo: 'X',
    consent_given: true,
    consent_version: 'v1-2026',
    consent_at: new Date(),
    email_verified: true,
    twofa_verified: true,
    renaper_status: 'VERIFIED',
    is_active: true,
    is_approved: true,
  },
});

console.log(`✅ Cuenta ${user.role} creada: ${email}`);
console.log('   Ingresá por /login (URL oculta) y completá el código 2FA que aparece en pantalla en modo DEV.');

await prisma.$disconnect();
