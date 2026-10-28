import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { decrypt } from '../utils/crypto.js';

const router = express.Router();
const prisma = new PrismaClient();

// Todos requieren ADMIN
router.use(requireAuth, requireRole('ADMIN'));

// GET /api/admin/users - listar usuarios (sin exponer hashes, desencripta solo para admin auditado)
router.get('/users', async (req,res)=>{
  const users = await prisma.user.findMany({ orderBy:{created_at:'desc'} });
  // No devolver password_hash ni tramite_hash, desencriptar email/dni solo para mostrar parcial
  const safe = users.map(u=>{
    let email='***', dni='***', telefono=null;
    try{ email = decrypt(u.email_encrypted); }catch{}
    try{ dni = decrypt(u.dni_encrypted); }catch{}
    try{ telefono = u.telefono_encrypted ? decrypt(u.telefono_encrypted) : null; }catch{}
    return {
      id:u.id, email, dni: dni ? `***${dni.slice(-4)}` : '***', dni_last4:u.dni_last4,
      nombre:u.nombre, apellido:u.apellido, role:u.role, sexo:u.sexo,
      telefono, renaper_verified:u.renaper_verified, renaper_status:u.renaper_status,
      email_verified:u.email_verified, is_active:u.is_active, is_approved:u.is_approved,
      created_at:u.created_at, last_login_at:u.last_login_at,
    };
  });
  await prisma.auditLog.create({ data:{ user_id:req.user.sub, action:'ADMIN_LIST_USERS', entity:'User' }});
  res.json(safe);
});

// PATCH /api/admin/users/:id/approve
router.patch('/users/:id/approve', async (req,res)=>{
  const { is_approved, is_active, role } = req.body;
  const data={};
  if (typeof is_approved==='boolean') data.is_approved=is_approved;
  if (typeof is_active==='boolean') data.is_active=is_active;
  if (role && ['ADMIN','PROPIETARIO','INQUILINO'].includes(role)) data.role=role;
  const u = await prisma.user.update({ where:{id:req.params.id}, data });
  await prisma.auditLog.create({ data:{ user_id:req.user.sub, action:'ADMIN_UPDATE_USER', entity:'User', entity_id:u.id, metadata:JSON.stringify(data)}});
  res.json({ ok:true, user:{id:u.id, role:u.role, is_approved:u.is_approved}});
});

// PATCH /api/admin/properties/:id/assign - asignar propietario
router.patch('/properties/:id/assign', async (req,res)=>{
  const { owner_id } = req.body;
  if (!owner_id) return res.status(400).json({error:'owner_id requerido'});
  const owner = await prisma.user.findUnique({ where:{id:owner_id}});
  if (!owner || owner.role!=='PROPIETARIO') return res.status(400).json({error:'owner_id debe ser un PROPIETARIO'});
  const p = await prisma.property.update({ where:{id:req.params.id}, data:{ owner_id }});
  await prisma.auditLog.create({ data:{ user_id:req.user.sub, action:'ASSIGN_PROPERTY', entity:'Property', entity_id:p.id, metadata:JSON.stringify({owner_id})}});
  res.json(p);
});

// GET /api/admin/audit - ver logs (últimos 100)
router.get('/audit', async (req,res)=>{
  const logs = await prisma.auditLog.findMany({ orderBy:{created_at:'desc'}, take:100 });
  res.json(logs);
});

export default router;
