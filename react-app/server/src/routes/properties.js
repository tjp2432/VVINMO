import express from 'express';
import { PrismaClient } from '@prisma/client';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Subida de imágenes de propiedades (solo ADMIN)
// ---------------------------------------------------------------------------
const uploadDir = path.join(process.cwd(), 'uploads', 'properties');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    cb(null, `${Date.now()}_${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024, files: 12 },
  fileFilter: (_req, file, cb) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      return cb(new Error('Solo se aceptan imágenes JPG, PNG o WEBP'));
    }
    cb(null, true);
  },
});

// ---------------------------------------------------------------------------
// Serialización / normalización de campos
// ---------------------------------------------------------------------------
// Solo estos campos puede escribir el panel: nada de owner_id arbitrario,
// id ni created_at (mass-assignment).
const WRITABLE = [
  'title', 'description', 'address', 'neighborhood', 'city', 'price', 'currency',
  'expenses', 'type', 'property_type', 'status', 'rooms', 'bedrooms', 'bathrooms',
  'garage', 'area_m2', 'area_covered_m2', 'features', 'images', 'external_link',
  'featured', 'published',
];

const INT_FIELDS = ['rooms', 'bedrooms', 'bathrooms', 'garage'];
const FLOAT_FIELDS = ['area_m2', 'area_covered_m2'];

function texto(v) {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s === '' ? null : s;
}

function numero(v) {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// Acepta array o JSON string y devuelve el JSON a guardar (o null).
function jsonArray(v) {
  if (v === undefined || v === null) return null;
  let arr = v;
  if (typeof v === 'string') {
    const s = v.trim();
    if (!s) return null;
    try { arr = JSON.parse(s); } catch { arr = s.split('\n'); }
  }
  if (!Array.isArray(arr)) return null;
  const limpio = arr.map(x => String(x).trim()).filter(Boolean);
  return limpio.length ? JSON.stringify(limpio) : null;
}

function pick(body = {}) {
  const data = {};
  for (const f of WRITABLE) {
    if (body[f] === undefined) continue;
    if (f === 'features' || f === 'images') data[f] = jsonArray(body[f]);
    else if (INT_FIELDS.includes(f)) data[f] = numero(body[f]) === null ? null : Math.trunc(numero(body[f]));
    else if (FLOAT_FIELDS.includes(f)) data[f] = numero(body[f]);
    else if (f === 'featured' || f === 'published') data[f] = body[f] === true || body[f] === 'true';
    else data[f] = texto(body[f]);
  }
  return data;
}

function toApi(p) {
  const parse = (v) => {
    if (!v) return [];
    try { const a = JSON.parse(v); return Array.isArray(a) ? a : []; } catch { return []; }
  };
  return { ...p, features: parse(p.features), images: parse(p.images) };
}

// ---------------------------------------------------------------------------
// Público
// ---------------------------------------------------------------------------
// El sitio público no necesita saber a qué usuario pertenece la propiedad.
function sinDuenio(p) {
  const { owner_id: _owner, ...resto } = p;
  return resto;
}

// GET /api/properties - solo propiedades publicadas
router.get('/', async (_req, res) => {
  const props = await prisma.property.findMany({
    where: { published: true },
    orderBy: [{ featured: 'desc' }, { created_at: 'desc' }],
  });
  res.json(props.map(p => sinDuenio(toApi(p))));
});

// ---------------------------------------------------------------------------
// Admin
// ---------------------------------------------------------------------------
// GET /api/properties/admin/all - incluye borradores / no publicadas
router.get('/admin/all', requireAuth, requireRole('ADMIN'), async (_req, res) => {
  const props = await prisma.property.findMany({ orderBy: { created_at: 'desc' } });
  res.json(props.map(toApi));
});

// POST /api/properties/images - sube hasta 12 imágenes y devuelve sus URLs
router.post(
  '/images',
  requireAuth,
  requireRole('ADMIN'),
  upload.array('images', 12),
  (req, res) => {
    const urls = (req.files || []).map(f => `/uploads/properties/${f.filename}`);
    res.json({ urls });
  },
);

// GET /api/properties/:id - detalle público (solo publicadas)
router.get('/:id', async (req, res) => {
  const p = await prisma.property.findUnique({ where: { id: req.params.id } });
  if (!p || !p.published) return res.status(404).json({ error: 'Propiedad no encontrada' });
  res.json(sinDuenio(toApi(p)));
});

// POST /api/properties - crear
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const data = pick(req.body);
  if (!data.title || !data.address || !data.price || !data.type) {
    return res.status(400).json({ error: 'Título, dirección, precio y operación son obligatorios' });
  }
  const p = await prisma.property.create({ data });
  await prisma.auditLog.create({
    data: { user_id: req.user.sub, action: 'CREATE_PROPERTY', entity: 'Property', entity_id: p.id },
  });
  res.status(201).json(toApi(p));
});

// PUT /api/properties/:id - editar
router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const data = pick(req.body);
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nada para actualizar' });
  try {
    const p = await prisma.property.update({ where: { id: req.params.id }, data });
    await prisma.auditLog.create({
      data: { user_id: req.user.sub, action: 'UPDATE_PROPERTY', entity: 'Property', entity_id: p.id },
    });
    res.json(toApi(p));
  } catch {
    res.status(404).json({ error: 'Propiedad no encontrada' });
  }
});

// DELETE /api/properties/:id - eliminar
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const p = await prisma.property.findUnique({ where: { id: req.params.id }, include: { contracts: true } });
    if (!p) return res.status(404).json({ error: 'Propiedad no encontrada' });
    if (p.contracts.length) {
      return res.status(409).json({ error: 'La propiedad tiene contratos asociados; despublicala en lugar de borrarla' });
    }
    await prisma.property.delete({ where: { id: req.params.id } });
    // Borrar las fotos subidas (solo las que viven en /uploads)
    for (const url of toApi(p).images) {
      if (url.startsWith('/uploads/properties/')) {
        fs.rm(path.join(process.cwd(), url.replace(/^\//, '')), { force: true }, () => {});
      }
    }
    await prisma.auditLog.create({
      data: { user_id: req.user.sub, action: 'DELETE_PROPERTY', entity: 'Property', entity_id: p.id },
    });
    res.json({ ok: true });
  } catch {
    res.status(404).json({ error: 'Propiedad no encontrada' });
  }
});

export default router;
