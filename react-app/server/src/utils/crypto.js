import crypto from 'crypto';

const ALGO = 'aes-256-gcm';
const IV_LEN = 12;

function getKey() {
  const hex = process.env.DATA_ENCRYPTION_KEY;
  if (!hex || hex.length !== 64) throw new Error('DATA_ENCRYPTION_KEY debe ser 64 hex chars (32 bytes)');
  return Buffer.from(hex, 'hex');
}

export function encrypt(plaintext) {
  if (plaintext == null) return null;
  const iv = crypto.randomBytes(IV_LEN);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // formato: v1:iv:tag:ciphertext (todo base64)
  const kid = process.env.ENCRYPTION_KEY_ID || 'v1';
  return `${kid}:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`;
}

export function decrypt(payload) {
  if (!payload) return null;
  const [, ivB64, tagB64, dataB64] = payload.split(':');
  if (!ivB64 || !tagB64 || !dataB64) throw new Error('payload encriptado inválido');
  const iv = Buffer.from(ivB64, 'base64');
  const tag = Buffer.from(tagB64, 'base64');
  const data = Buffer.from(dataB64, 'base64');
  const decipher = crypto.createDecipheriv(ALGO, getKey(), iv);
  decipher.setAuthTag(tag);
  const dec = Buffer.concat([decipher.update(data), decipher.final()]);
  return dec.toString('utf8');
}

export function sha256(text) {
  return crypto.createHash('sha256').update(String(text).toLowerCase().trim()).digest('hex');
}

export function hashTramite(tramite) {
  // N° trámite nunca en claro, solo hash + salt
  const salt = process.env.JWT_SECRET.slice(0, 16);
  return crypto.createHash('sha256').update(salt + String(tramite).trim()).digest('hex');
}

export function maskDni(dni) {
  const s = String(dni);
  return s.slice(-4).padStart(s.length, '*');
}

export function generateCode(len = 6) {
  const n = crypto.randomInt(0, Math.pow(10, len));
  return String(n).padStart(len, '0');
}
