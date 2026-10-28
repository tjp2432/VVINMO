import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Register(){
  const { register } = useAuth();
  const nav = useNavigate();
  const [err,setErr]=useState(''); const [ok,setOk]=useState('');

  async function submit(e){
    e.preventDefault(); setErr(''); setOk('');
    const fd = new FormData(e.target);
    const data = Object.fromEntries(fd.entries());
    // checkbox viene como "on" si está tildado
    const payload = {
      nombre: data.nombre?.trim(),
      apellido: data.apellido?.trim(),
      email: data.email?.trim(),
      password: data.password,
      dni: data.dni?.trim(),
      sexo: data.sexo,
      tramite: data.tramite?.trim(),
      cuit: data.cuit?.trim() || undefined,
      telefono: data.telefono?.trim() || undefined,
      role: data.role,
      consent_given: data.consent_given === 'on',
      privacy_version:'v1-2026',
    };
    try{
      const r = await register(payload);
      setOk(`Registro ok. Código 2FA enviado a ${payload.email}. ${r._dev_code?`DEV: ${r._dev_code}`:''}`);
      setTimeout(()=> nav(`/verify-2fa?email=${encodeURIComponent(payload.email)}&purpose=register`), 900);
    }catch(ex){ setErr(ex.message); }
  }

  return (
    <div className="auth-page">
      <form onSubmit={submit} className="contact-glass" style={{margin:'90px auto', maxWidth:720}}>
        <h2 className="section-title">Crear cuenta</h2>
        <p style={{textAlign:'center',marginBottom:18,fontSize:14,opacity:0.7}}>Validación RENAPER (mock) + Ley 25.326. 2FA obligatorio por mail/SMS.</p>
        {err && <div style={{background:'#fee',padding:10,borderRadius:8,marginBottom:12,color:'#800'}}>{err}</div>}
        {ok && <div style={{background:'#e6ffed',padding:10,borderRadius:8,marginBottom:12,color:'#144'}}>{ok}</div>}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14}}>
          <div className="form-group"><label>Nombre *</label><input name="nombre" required defaultValue="" autoComplete="given-name" /></div>
          <div className="form-group"><label>Apellido *</label><input name="apellido" required defaultValue="" autoComplete="family-name" /></div>
          <div className="form-group"><label>Email *</label><input name="email" type="email" required defaultValue="" autoComplete="email" /></div>
          <div className="form-group"><label>Contraseña *</label><input name="password" type="password" required defaultValue="" autoComplete="new-password" placeholder="Min 8, mayúscula, número" /></div>
          <div className="form-group"><label>DNI (7-8 dígitos) *</label><input name="dni" required defaultValue="" placeholder="30123456" inputMode="numeric" autoComplete="off" /></div>
          <div className="form-group"><label>Sexo DNI *</label><select name="sexo" defaultValue="M" style={{width:'100%',padding:'0.85rem 1rem',borderRadius:18,border:'1px solid rgba(255,255,255,0.35)'}}><option value="M">M</option><option value="F">F</option><option value="X">X</option></select></div>
          <div className="form-group"><label>N° Trámite (11 dígitos) *</label><input name="tramite" required defaultValue="" placeholder="12345678901" inputMode="numeric" autoComplete="off" /></div>
          <div className="form-group"><label>CUIT (opcional)</label><input name="cuit" defaultValue="" placeholder="20-30123456-3" /></div>
          <div className="form-group"><label>Teléfono (para 2FA SMS)</label><input name="telefono" defaultValue="" placeholder="+54 9 11..." autoComplete="tel" /></div>
          <div className="form-group"><label>Rol *</label><select name="role" defaultValue="INQUILINO" style={{width:'100%',padding:'0.85rem 1rem',borderRadius:18,border:'1px solid rgba(255,255,255,0.35)'}}><option value="INQUILINO">Inquilino</option><option value="PROPIETARIO">Propietario</option></select></div>
        </div>
        <div style={{marginTop:14,background:'rgba(255,255,255,0.6)',padding:12,borderRadius:12,fontSize:13, contain:'paint'}}>
          <label style={{display:'flex',gap:8,alignItems:'flex-start'}}><input type="checkbox" name="consent_given" required />
          <span>Acepto la <Link to="/privacidad" target="_blank" style={{color:'#c0006e',fontWeight:600}}>Política de Privacidad (Ley 25.326)</Link> y autorizo el tratamiento de mis datos personales (DNI, CUIT) para validación RENAPER y gestión inmobiliaria. Sé que puedo ejercer derechos de acceso, rectificación y supresión contactando al DPO.</span></label>
          <p style={{marginTop:6,opacity:0.7}}>Base inscripta ante AAIP. Datos encriptados AES-256-GCM. N° trámite solo hasheado.</p>
        </div>
        <button className="btn" type="submit" style={{width:'100%',marginTop:16}}>Registrarme y recibir 2FA</button>
        <p style={{marginTop:14,textAlign:'center'}}>¿Ya tenés cuenta? <Link to="/login" style={{color:'#c0006e',fontWeight:600}}>Ingresar</Link></p>
      </form>
    </div>
  );
}
