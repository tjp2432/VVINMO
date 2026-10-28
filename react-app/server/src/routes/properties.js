import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// Público: listar propiedades (sin exponer owner PII)
router.get('/', async (req, res) => {
  const props = await prisma.property.findMany({ orderBy: { created_at: 'desc' } });
  res.json(props);
});

// ADMIN crea propiedad
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const p = await prisma.property.create({ data: { ...req.body } });
  await prisma.auditLog.create({ data: { user_id: req.user.sub, action: 'CREATE_PROPERTY', entity: 'Property', entity_id: p.id } });
  res.json(p);
});

router.put('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  const p = await prisma.property.update({ where: { id: req.params.id }, data: req.body });
  res.json(p);
});

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  await prisma.property.delete({ where: { id: req.params.id } });
  res.json({ ok: true });
});

export default router;
