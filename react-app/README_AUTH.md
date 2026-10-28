# VV Inmook - Sistema Auth + RENAPER + Ley 25.326

## Stack
- Frontend: Vite + React 19 + React Router ( `src/App.jsx:1` ) - proxies /api -> 4000
- Backend: Express 4 + Prisma 5 + SQLite (dev) -> Postgres prod + Argon2id + AES-256-GCM + JWT httpOnly + Helmet + RateLimit

## Puesta en marcha LOCAL

### 1) Backend
```powershell
cd react-app/server
npm install
npx prisma migrate dev   # ya ejecutado, crea dev.db
node prisma/seed.js      # crea admin@veronicavillafane.com / Admin1234!
node src/index.js        # http://localhost:4000/api/health
```
`.env` ya creado con `DATA_ENCRYPTION_KEY` (64 hex). En prod generar nuevo: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

### 2) Frontend
```powershell
cd react-app
npm install
npm run dev  # http://localhost:5173
```
Vite proxy ya configurado en `vite.config.js:8` -> /api a 4000.

### 3) Flujo probado
- `POST /api/auth/register` con {nombre, apellido, email, password, dni, sexo, tramite(11), cuit?, telefono?, role: PROPIETARIO|INQUILINO, consent_given:true}
  -> valida RENAPER mock, encripta DNI/CUIT/tel con AES-256-GCM, hashea tramite, guarda consent_version, envia 2FA (mock console + _dev_code en dev)
- `POST /api/auth/verify-2fa` {email, code, purpose:register} -> activa cuenta, setea cookies httpOnly
- `POST /api/auth/login` -> verifica pass + re-envia 2FA (2FA para todos)
- `POST /api/auth/verify-2fa` purpose:login -> emite access(15m) + refresh(7d) cookies
- `GET /api/auth/me` requiere cookie
- `GET /api/auth/me/export` ARCO export
- `DELETE /api/auth/me` ARCO supresión

Credencial admin seed: `admin@veronicavillafane.com / Admin1234!` -> login -> 2FA -> /admin

Mock RENAPER: `server/src/services/renaper.service.js:1` - si DNI termina en 0 o tramite 000... -> REJECTED. Resto VERIFIED. Cambiar `RENAPER_PROVIDER=real` + `RENAPER_API_URL/KEY` para SIDI real sin tocar código.

## Migración a Postgres / g2khosting (económico y nacional)
1. En `server/prisma/schema.prisma:4` cambiar `provider = "postgresql"`
2. En `server/.env` poner `DATABASE_URL="postgresql://user:pass@host:5432/vvinmook?schema=public"` (g2khosting te da el string)
3. `npx prisma migrate deploy` + `node prisma/seed.js`
4. Asegurar TLS: g2khosting ya da Let's Encrypt. Forzar redirect http->https y HSTS (helmet ya lo hace en prod si NODE_ENV=production)
5. Variables prod obligatorias: `JWT_SECRET` y `JWT_REFRESH_SECRET` de 64+ chars, `DATA_ENCRYPTION_KEY` nuevo, `FRONTEND_URL=https://tudominio.com`, `NODE_ENV=production`
6. Deploy: Node 20+ en g2khosting (o VPS). `npm run build` en frontend, servir `dist/` con nginx/apache y proxy /api al backend (PM2: `pm2 start server/src/index.js --name vvinmook`)

## Seguridad / Ley 25.326
- Encriptación at-rest: `src/utils/crypto.js:1` AES-256-GCM con IV único por campo + key id rotation ready
- Passwords: argon2id
- Consentimiento: checkbox obligatorio en Register, guarda `consent_version/at`, link a /privacidad
- Derechos ARCO: endpoints /me/export y DELETE /me
- Auditoría: tabla AuditLog en cada register/verify/login/property create
- Headers: helmet, cors credentials, rateLimit 8/min en login/register, cookies httpOnly Secure SameSite=Strict
- Secretos: nunca loguear PII en claro, solo hashes (sha256 email/dni)

## Próximos pasos sugeridos
- Integrar SMTP real (Brevo/Resend/SMTP g2k) en `mail.service.js:1` + SMS Twilio para 2FA
- Panel ADMIN para aprobar usuarios, asignar propiedades a propietarios, crear contratos
- Subida de docs con encriptación
