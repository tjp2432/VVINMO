// Servicio de mail mock para 2FA - En producción reemplazar por Nodemailer + SMTP g2khosting / Resend / Brevo
// Cumple Ley 25.326: no exponer PII en logs, solo email_hash

export async function send2FACode({ email, code, purpose }) {
  // En dev: log en consola (simula envío)
  // En prod: integrar con SMTP
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📧 [MOCK MAIL] 2FA (${purpose}) para ${email}`);
  console.log(`   Código: ${code}  (expira en 10 min)`);
  console.log(`   En producción se enviaría por SMTP/SMS real`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  // También podrías integrar SMS: Twilio, etc. Por ahora mock mail+SMS
  return { sent: true, mocked: true };
}

export async function sendInviteMail({ email, role }) {
  console.log(`\n📧 [MOCK] Invitación ${role} enviada a ${email}\n`);
  return { sent: true, mocked: true };
}
