import express from 'express';
import argon2 from 'argon2';
import jwt from 'jsonwebtoken';
import { PrismaClient } from '@prisma/client';
import { registerSchema, loginSchema, verify2FASchema } from '../utils/validators.js';
import { encrypt, sha256, hashTramite, generateCode } from '../utils/crypto.js';
import { verifyRenaper } from '../services/renaper.service.js';
import { send2FACode } from '../services/mail.service.js';
import { signAccessToken, signRefreshToken, requireAuth } from '../middleware/auth.js';

const router = express.Router();
const prisma = new PrismaClient();

// POST /api/auth/register - solicita alta con cualquier mail (según requerimiento)
router.post('/register', async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const email_hash = sha256(data.email);
    const dni_hash = sha256(data.dni);
    const existing = await prisma.user.findFirst({ where: { OR: [{ email_hash }, { dni_hash }] } });
    if (existing) return res.status(409).json({ error: 'Email o DNI ya registrado' });

    // Validar RENAPER (mock o real)
    const renaper = await verifyRenaper({ dni: data.dni, sexo: data.sexo, tramite: data.tramite, cuit: data.cuit });
    if (!renaper.verified) {
      return res.status(422).json({ error: `Validación RENAPER falló: ${renaper.reason}`, renaper });
    }

    const password_hash = await argon2.hash(data.password, { type: argon2.argon2id });
    const code = generateCode(6);
    const code_hash = await argon2.hash(code);

    const user = await prisma.user.create({
      data: {
        email: data.email, // guardamos también en claro para compat pero principal es encrypted
        email_encrypted: encrypt(data.email),
        email_hash,
        password_hash,
        role: data.role,
        nombre: data.nombre,
        apellido: data.apellido,
        dni_encrypted: encrypt(data.dni),
        dni_hash,
        dni_last4: String(data.dni).slice(-4),
        cuit_encrypted: data.cuit ? encrypt(data.cuit) : null,
        cuit_hash: data.cuit ? sha256(data.cuit) : null,
        sexo: data.sexo,
        tramite_hash: hashTramite(data.tramite),
        telefono_encrypted: data.telefono ? encrypt(data.telefono) : null,
        fecha_nacimiento: data.fecha_nacimiento ? new Date(data.fecha_nacimiento) : null,
        renaper_verified: true,
        renaper_verified_at: new Date(),
        renaper_status: 'VERIFIED',
        consent_given: true,
        consent_version: data.privacy_version || 'v1-2026',
        consent_at: new Date(),
        privacy_accepted_at: new Date(),
        email_verify_code: code_hash,
        email_verify_expires: new Date(Date.now() + 10 * 60 * 1000),
        is_approved: data.role === 'ADMIN' ? false : true, // auto-aprobado por ahora, ADMIN puede requerir aprobación
      },
    });

    await prisma.twoFactorCode.create({
      data: {
        email_hash,
        code_hash,
        purpose: 'register',
        expires_at: new Date(Date.now() + 10 * 60 * 1000),
      },
    });

    await send2FACode({ email: data.email, code, purpose: 'register' });

    // Auditoría (sin PII en claro)
    await prisma.auditLog.create({ data: { user_id: user.id, action: 'REGISTER', entity: 'User', entity_id: user.id, metadata: JSON.stringify({ renaper: renaper.status }) } });

    // No devolvemos el código en prod, solo en dev para facilitar testing
    const isDev = process.env.NODE_ENV !== 'production';
    return res.json({
      message: 'Registro exitoso. Revisa tu mail con el código 2FA (10 min).',
      email: data.email,
      next: '/verify-2fa?purpose=register',
      ...(isDev ? { _dev_code: code } : {}),
    });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validación falló', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: 'Error interno', detail: e.message });
  }
});

// POST /api/auth/verify-2fa
router.post('/verify-2fa', async (req, res) => {
  try {
    const { email, code, purpose } = verify2FASchema.parse(req.body);
    const email_hash = sha256(email);
    const record = await prisma.twoFactorCode.findFirst({
      where: { email_hash, purpose, used: false },
      orderBy: { created_at: 'desc' },
    });
    if (!record) return res.status(404).json({ error: 'Código no encontrado' });
    if (record.expires_at < new Date()) return res.status(410).json({ error: 'Código expirado' });

    const ok = await argon2.verify(record.code_hash, code);
    if (!ok) return res.status(401).json({ error: 'Código inválido' });

    await prisma.twoFactorCode.update({ where: { id: record.id }, data: { used: true } });

    // Si es register, marcar email_verified
    if (purpose === 'register') {
      const user = await prisma.user.findUnique({ where: { email_hash } });
      if (user) {
        await prisma.user.update({ where: { id: user.id }, data: { email_verified: true, twofa_verified: true } });
      }
    }

    // Si es login, emitir tokens (el login ya habrá validado pass, este es el segundo factor)
    const user = await prisma.user.findUnique({ where: { email_hash } });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });

    const access_token = signAccessToken(user);
    const refresh_token = signRefreshToken(user);

    res.cookie('access_token', access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
    res.cookie('refresh_token', refresh_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 7 * 24 * 60 * 60 * 1000, path: '/api/auth' });

    await prisma.user.update({ where: { id: user.id }, data: { last_login_at: new Date(), twofa_verified: true } });
    await prisma.auditLog.create({ data: { user_id: user.id, action: 'VERIFY_2FA', entity: 'User', metadata: JSON.stringify({ purpose }) } });

    return res.json({ message: '2FA verificado', role: user.role, user: { id: user.id, email, role: user.role, nombre: user.nombre } });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validación falló', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);
    const email_hash = sha256(email);
    const user = await prisma.user.findUnique({ where: { email_hash } });
    if (!user || !user.is_active) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await argon2.verify(user.password_hash, password);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    if (!user.email_verified) return res.status(403).json({ error: 'Email no verificado. Revisa tu código 2FA', need_verify: true });

    // Generar y enviar 2FA para cada login (requerimiento: 2FA para todos)
    const code = generateCode(6);
    const code_hash = await argon2.hash(code);
    await prisma.twoFactorCode.create({
      data: { email_hash, code_hash, purpose: 'login', expires_at: new Date(Date.now() + 10 * 60 * 1000) },
    });
    await send2FACode({ email, code, purpose: 'login' });
    await prisma.auditLog.create({ data: { user_id: user.id, action: 'LOGIN_2FA_SENT', entity: 'User' } });

    const isDev = process.env.NODE_ENV !== 'production';
    return res.json({ message: 'Código 2FA enviado a tu mail/SMS', need_2fa: true, email, ...(isDev ? { _dev_code: code } : {}) });
  } catch (e) {
    if (e.name === 'ZodError') return res.status(400).json({ error: 'Validación', details: e.errors });
    console.error(e);
    return res.status(500).json({ error: e.message });
  }
});

router.post('/refresh', async (req, res) => {
  const token = req.cookies?.refresh_token;
  if (!token) return res.status(401).json({ error: 'No refresh token' });
  try {
    const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET, { issuer: 'vvinmook' });
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user) return res.status(401).json({ error: 'Usuario no existe' });
    const access_token = signAccessToken(user);
    res.cookie('access_token', access_token, { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', maxAge: 15 * 60 * 1000 });
    return res.json({ message: 'Token renovado' });
  } catch {
    return res.status(401).json({ error: 'Refresh inválido' });
  }
});

router.post('/logout', (req, res) => {
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/auth' });
  return res.json({ message: 'Sesión cerrada' });
});

router.get('/me', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  return res.json({ id: user.id, email_hash: user.email_hash, role: user.role, nombre: user.nombre, apellido: user.apellido, renaper_verified: user.renaper_verified, email_verified: user.email_verified });
});

// ARCO - Ley 25.326: exportar datos
router.get('/me/export', requireAuth, async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.sub } });
  return res.json({ data: { id: user.id, role: user.role, nombre: user.nombre, apellido: user.apellido, dni_last4: user.dni_last4, consent_given: user.consent_given, created_at: user.created_at }, notice: 'Datos exportados según art. 14 Ley 25.326. Para rectificación/supresión use PATCH/DELETE /api/auth/me' });
});

// ARCO - supresión (derecho al olvido, art.16)
router.delete('/me', requireAuth, async (req, res) => {
  await prisma.user.update({ where: { id: req.user.sub }, data: { is_active: false, email: `deleted_${Date.now()}@deleted.local`, email_hash: sha256(`deleted_${Date.now()}`) } });
  await prisma.auditLog.create({ data: { user_id: req.user.sub, action: 'DELETE_ME', entity: 'User' } });
  res.clearCookie('access_token');
  res.clearCookie('refresh_token', { path: '/api/auth' });
  return res.json({ message: 'Cuenta desactivada (supresión). Contacta al DPO para borrado definitivo.' });
});

export default router;
