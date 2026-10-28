export default function Privacidad(){
  return (
    <div style={{maxWidth:860,margin:'90px auto',padding:'0 5%'}}>
      <h1>Política de Privacidad — Ley 25.326</h1>
      <p style={{opacity:0.7}}>Última actualización: 22/09/2026 — Responsable: Verónica Villafañe Inmobiliaria Integral — DPO: info@veronicavillafane.com — Virrey del Pino 2829, CABA</p>
      <h3 style={{marginTop:20}}>1. Datos que recolectamos</h3>
      <p>Nombre, apellido, email, DNI (validado RENAPER), CUIT/CUIL, sexo, n° trámite (hasheado, no almacenado en claro), teléfono, fecha nacimiento. Solo lo necesario para gestión inmobiliaria y cumplimiento legal.</p>
      <h3>2. Finalidad y base legal</h3>
      <p>Validación de identidad (RENAPER), creación y ejecución de contratos de alquiler/venta, cumplimiento Ley de Alquileres y Prevención Lavado. Base: consentimiento art. 5 Ley 25.326.</p>
      <h3>3. Conservación</h3>
      <p>Mientras dure la relación contractual + 5 años por obligaciones legales. Luego anonimización/borrado seguro.</p>
      <h3>4. Seguridad</h3>
      <p>TLS 1.3 en tránsito, AES-256-GCM en reposo para DNI/CUIT/tel, Argon2id para contraseñas, JWT httpOnly, logs auditados, backups cifrados.</p>
      <h3>5. Derechos ARCO (art. 14-16)</h3>
      <p>Podés acceder, rectificar, actualizar o suprimir tus datos en cualquier momento desde tu panel o escribiendo al DPO. Exportación en /api/auth/me/export.</p>
      <h3>6. Cesiones</h3>
      <p>No vendemos datos. Solo compartimos con escribanos/organismos por obligación legal o con tu consentimiento expreso.</p>
      <h3>7. RENAPER</h3>
      <p>La validación se hace contra RENAPER (mock en desarrollo, SIDI en producción). Solo guardamos resultado VERIFICADO/RECHAZADO y hash del trámite.</p>
      <h3>8. Registro</h3>
      <p>Base inscripta ante AAIP. Reclamos: Av. Paseo Colón 1093, CABA.</p>
    </div>
  );
}
