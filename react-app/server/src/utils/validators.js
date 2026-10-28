import { z } from 'zod';

// Validación DNI Argentina 7-8 dígitos
export function isValidDNI(dni) {
  return /^[0-9]{7,8}$/.test(String(dni).trim());
}

// CUIT/CUIL 11 dígitos con dígito verificador (módulo 11)
export function isValidCUIT(cuit) {
  const s = String(cuit).replace(/[^0-9]/g, '');
  if (s.length !== 11) return false;
  const mult = [5,4,3,2,7,6,5,4,3,2];
  let sum = 0;
  for (let i=0;i<10;i++) sum += parseInt(s[i])*mult[i];
  let mod = 11 - (sum % 11);
  if (mod === 11) mod = 0;
  if (mod === 10) mod = 9;
  return mod === parseInt(s[10]);
}

// N° Trámite 11 dígitos (dni nuevo) o variaciones
export function isValidTramite(tramite) {
  return /^[0-9]{11}$/.test(String(tramite).trim());
}

export const registerSchema = z.object({
  nombre: z.string().min(2).max(80),
  apellido: z.string().min(2).max(80),
  email: z.string().email(),
  password: z.string().min(8).max(100)
    .regex(/[A-Z]/, 'Debe tener una mayúscula')
    .regex(/[a-z]/, 'Debe tener una minúscula')
    .regex(/[0-9]/, 'Debe tener un número'),
  dni: z.string().regex(/^[0-9]{7,8}$/, 'DNI 7-8 dígitos'),
  sexo: z.enum(['M','F','X']),
  tramite: z.string().regex(/^[0-9]{11}$/, 'N° trámite 11 dígitos'),
  cuit: z.string().optional().refine(v=>!v || isValidCUIT(v), 'CUIT inválido'),
  telefono: z.string().min(8).max(20).optional(),
  fecha_nacimiento: z.string().optional(), // ISO
  role: z.enum(['PROPIETARIO','INQUILINO']).default('INQUILINO'),
  consent_given: z.boolean().refine(v=>v===true, 'Debe aceptar la política de privacidad (Ley 25.326)'),
  privacy_version: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const verify2FASchema = z.object({
  email: z.string().email(),
  code: z.string().length(6),
  purpose: z.enum(['login','register']).default('login'),
});
