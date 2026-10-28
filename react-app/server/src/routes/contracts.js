import express from 'express';
import { PrismaClient } from '@prisma/client';
import { requireAuth, requireRole } from '../middleware/auth.js';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';

const router = express.Router();
const prisma = new PrismaClient();

// Upload comprobantes - solo documentación, encriptado at-rest simulado
// En prod real: guardar en S3 compatible g2khosting con cifrado server-side
const uploadDir = path.join(process.cwd(), 'uploads', 'receipts');
fs.mkdirSync(uploadDir, { recursive:true });
const storage = multer.diskStorage({
  destination: (_,__,cb)=> cb(null, uploadDir),
  filename: (_,file,cb)=>{
    const ext = path.extname(file.originalname);
    cb(null, `receipt_${Date.now()}_${crypto.randomBytes(4).toString('hex')}${ext}`);
  }
});
const upload = multer({ storage, limits:{ fileSize: 8*1024*1024 }, fileFilter:(_,file,cb)=>{
  if (!['image/jpeg','image/png','application/pdf'].includes(file.mimetype)) return cb(new Error('Solo JPG/PNG/PDF'));
  cb(null,true);
}});

// Crear contrato - solo ADMIN
router.post('/', requireAuth, requireRole('ADMIN'), async (req,res)=>{
  const { property_id, owner_id, tenant_id, start_date, end_date, rent_amount, currency='ARS', deposit, status='vigente' } = req.body;
  if (!property_id || !owner_id || !tenant_id || !start_date || !end_date || !rent_amount) return res.status(400).json({error:'Faltan campos obligatorios'});
  // validar que property existe y que owner/tenant existen
  const prop = await prisma.property.findUnique({where:{id:property_id}});
  if (!prop) return res.status(404).json({error:'Propiedad no existe'});
  const c = await prisma.contract.create({
    data:{ property_id, owner_id, tenant_id, start_date:new Date(start_date), end_date:new Date(end_date), rent_amount: Number(rent_amount), currency, deposit: deposit?Number(deposit):null, status }
  });
  // marcar propiedad como alquilada si es alquiler
  await prisma.property.update({ where:{id:property_id}, data:{ status:'alquilada'}});
  await prisma.auditLog.create({ data:{ user_id:req.user.sub, action:'CREATE_CONTRACT', entity:'Contract', entity_id:c.id, metadata:JSON.stringify({property_id, owner_id, tenant_id})}});
  res.json(c);
});

// Listar contratos según rol
router.get('/', requireAuth, async (req,res)=>{
  const me = req.user;
  let where={};
  if (me.role==='PROPIETARIO') where={ owner_id: me.sub };
  else if (me.role==='INQUILINO') where={ tenant_id: me.sub };
  // ADMIN ve todo
  const contracts = await prisma.contract.findMany({ where, include:{ property:true, payments:true }, orderBy:{created_at:'desc'}});
  res.json(contracts);
});

router.get('/:id', requireAuth, async (req,res)=>{
  const c = await prisma.contract.findUnique({ where:{id:req.params.id}, include:{ property:true, payments:true, owner:true, tenant:true }});
  if (!c) return res.status(404).json({error:'No encontrado'});
  // check permiso
  if (req.user.role!=='ADMIN' && c.owner_id!==req.user.sub && c.tenant_id!==req.user.sub) return res.status(403).json({error:'No autorizado'});
  res.json(c);
});

// Documentar pago (solo documentación, no procesa dinero) - ADMIN o partes del contrato
router.post('/:id/payments', requireAuth, upload.single('receipt'), async (req,res)=>{
  const contract = await prisma.contract.findUnique({where:{id:req.params.id}});
  if (!contract) return res.status(404).json({error:'Contrato no existe'});
  if (req.user.role!=='ADMIN' && contract.owner_id!==req.user.sub && contract.tenant_id!==req.user.sub) return res.status(403).json({error:'No autorizado'});

  const { amount, due_date, paid_at, status='pagado', method, notes } = req.body;
  if (!amount || !due_date) return res.status(400).json({error:'amount y due_date requeridos'});

  // Si se subió archivo, el path ya es local. En prod se encripta: aquí simulamos guardando path
  // TODO prod: encriptar archivo con AES-256-GCM antes de subir a S3
  let receipt_url = null;
  if (req.file) {
    receipt_url = `/uploads/receipts/${req.file.filename}`;
  } else if (req.body.receipt_url) {
    receipt_url = req.body.receipt_url; // URL externa si no hay archivo
  }

  const pay = await prisma.payment.create({
    data:{
      contract_id: contract.id,
      amount: Number(amount),
      due_date: new Date(due_date),
      paid_at: paid_at ? new Date(paid_at) : new Date(),
      status, // pagado | pendiente | vencido - solo documentación
      method: method || 'transferencia',
      receipt_url,
    }
  });
  await prisma.auditLog.create({ data:{ user_id:req.user.sub, action:'DOCUMENT_PAYMENT', entity:'Payment', entity_id:pay.id, metadata:JSON.stringify({contract_id:contract.id, amount, hasReceipt:!!receipt_url})}});
  res.json(pay);
});

// Listar documentación de pagos de un contrato
router.get('/:id/payments', requireAuth, async (req,res)=>{
  const contract = await prisma.contract.findUnique({where:{id:req.params.id}});
  if (!contract) return res.status(404).json({error:'No existe'});
  if (req.user.role!=='ADMIN' && contract.owner_id!==req.user.sub && contract.tenant_id!==req.user.sub) return res.status(403).json({error:'No autorizado'});
  const pays = await prisma.payment.findMany({ where:{contract_id:req.params.id}, orderBy:{due_date:'desc'}});
  res.json(pays);
});

router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req,res)=>{
  await prisma.payment.deleteMany({ where:{contract_id:req.params.id}});
  await prisma.contract.delete({ where:{id:req.params.id}});
  await prisma.auditLog.create({ data:{ user_id:req.user.sub, action:'DELETE_CONTRACT', entity:'Contract', entity_id:req.params.id}});
  res.json({ok:true});
});

export default router;
