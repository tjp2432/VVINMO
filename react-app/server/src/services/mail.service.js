// Envío de mails. Si están cargadas las variables SMTP_* usa el servidor real
// (el que te da el hosting); si no, imprime el código en consola (modo DEV).
// Ley 25.326: no se loguean datos personales, solo el destinatario del envío.
import nodemailer from 'nodemailer';

// ¿Hay configuración SMTP completa?
export function mailConfigurado() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporte = null;

function getTransporte() {
  if (!transporte) {
    const port = Number(process.env.SMTP_PORT || 587);
    transporte = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: port === 465, // 465 = SSL directo; 587 = STARTTLS
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporte;
}

function remitente() {
  return process.env.SMTP_FROM || process.env.SMTP_USER;
}

const MARCA = 'Verónica Villafañe - Inmobiliaria Integral';

function plantilla({ titulo, intro, codigo }) {
  return `
  <div style="font-family:Arial,Helvetica,sans-serif;background:#f7f3ee;padding:28px">
    <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;padding:28px;border:1px solid #ecdfe6">
      <h1 style="margin:0 0 6px;font-size:18px;color:#121214">${MARCA}</h1>
      <p style="margin:0 0 18px;color:#555;font-size:14px">${titulo}</p>
      <p style="margin:0 0 10px;color:#333;font-size:14px">${intro}</p>
      <div style="font-size:30px;font-weight:800;letter-spacing:8px;color:#c0006e;background:#fff5fa;border:1px dashed #e9b7d2;border-radius:12px;padding:16px;text-align:center;margin:18px 0">${codigo}</div>
      <p style="margin:0;color:#777;font-size:12px">El código vence en 10 minutos. Si no fuiste vos, ignorá este mensaje.</p>
    </div>
  </div>`;
}

export async function send2FACode({ email, code, purpose }) {
  const esLogin = purpose === 'login';
  const asunto = esLogin ? `Tu código de acceso: ${code}` : `Tu código de verificación: ${code}`;
  const intro = esLogin
    ? 'Para entrar al panel ingresá este código:'
    : 'Para completar la verificación ingresá este código:';

  if (!mailConfigurado()) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`📧 [MOCK MAIL] 2FA (${purpose}) para ${email}`);
    console.log(`   Código: ${code}  (expira en 10 min)`);
    console.log(`   Configurá SMTP_HOST / SMTP_USER / SMTP_PASS en .env para enviarlo de verdad`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    return { sent: true, mocked: true };
  }

  await getTransporte().sendMail({
    from: remitente(),
    to: email,
    subject: asunto,
    text: `${intro}\n\n${code}\n\nVence en 10 minutos.\n${MARCA}`,
    html: plantilla({ titulo: 'Código de seguridad', intro, codigo: code }),
  });

  return { sent: true, mocked: false };
}

export async function sendInviteMail({ email, role }) {
  if (!mailConfigurado()) {
    console.log(`\n📧 [MOCK] Invitación ${role} enviada a ${email}\n`);
    return { sent: true, mocked: true };
  }

  await getTransporte().sendMail({
    from: remitente(),
    to: email,
    subject: 'Acceso al panel de Verónica Villafañe',
    text: `Te creamos una cuenta (${role}) en el panel.\nIngresá en /login con este email.\n${MARCA}`,
    html: plantilla({ titulo: 'Acceso al panel', intro: `Te creamos una cuenta (${role}). Ingresá con este email.`, codigo: '→  /login' }),
  });

  return { sent: true, mocked: false };
}
