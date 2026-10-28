import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { encrypt, sha256, hashTramite } from '../src/utils/crypto.js';
import 'dotenv/config';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding DB...');

  const adminEmail = 'admin@veronicavillafane.com';
  const adminHash = sha256(adminEmail);
  const exists = await prisma.user.findUnique({ where: { email_hash: adminHash } });
  if (!exists) {
    const pw = await argon2.hash('Admin1234!', { type: argon2.argon2id });
    await prisma.user.create({
      data: {
        email: adminEmail,
        email_encrypted: encrypt(adminEmail),
        email_hash: adminHash,
        password_hash: pw,
        role: 'ADMIN',
        nombre: 'Verónica',
        apellido: 'Villafañe',
        dni_encrypted: encrypt('30123456'),
        dni_hash: sha256('30123456'),
        dni_last4: '3456',
        sexo: 'F',
        tramite_hash: hashTramite('12345678901'),
        renaper_verified: true,
        renaper_status: 'VERIFIED',
        renaper_verified_at: new Date(),
        consent_given: true,
        consent_version: 'v1-2026',
        consent_at: new Date(),
        privacy_accepted_at: new Date(),
        email_verified: true,
        twofa_verified: true,
        is_active: true,
        is_approved: true,
      }
    });
    console.log(`✅ Admin creado: ${adminEmail} / Admin1234!`);
  } else {
    console.log('ℹ️ Admin ya existe');
  }

  const count = await prisma.property.count();
  if (count === 0) {
    await prisma.property.createMany({
      data: [
        { title: 'Chalet en Esquina - Saavedra', address: 'Crisólogo Larralde 4196', price: 'USD 249.000', type: 'venta', status: 'disponible', area_m2: 136 },
        { title: '2 Amb c/ Balcón Terraza - Villa Urquiza', address: 'Nuñez 4412', price: 'USD 117.000', type: 'venta', status: 'disponible', area_m2: 39 },
        { title: 'Oficina 140m² - Pellegrini 738', address: 'Carlos Pellegrini 738', price: 'Consultar', type: 'alquiler', status: 'disponible', area_m2: 140 },
      ]
    });
    console.log('✅ Propiedades de ejemplo creadas');
  }

  console.log('✅ Seed ok');
}

main().catch(e=>{ console.error(e); process.exit(1)}).finally(()=> prisma.$disconnect());
