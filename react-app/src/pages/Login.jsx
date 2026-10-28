import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');

  async function submit(e){
    e.preventDefault(); setErr(''); setInfo('');
    const fd = new FormData(e.target);
    const email = fd.get('email')?.toString().trim();
    const password = fd.get('password')?.toString();
    try{
      const r = await login(email, password);
      if (r.need_2fa) {
        setInfo(`Código 2FA enviado a ${email}. ${r._dev_code ? ` (DEV: ${r._dev_code})`:''}`);
        setTimeout(()=> nav(`/verify-2fa?email=${encodeURIComponent(email)}&purpose=login`), 800);
      }
    }catch(ex){ setErr(ex.message); }
  }

  return (
    <div className="auth-page">
      <form onSubmit={submit} className="contact-glass" style={{margin:'90px auto'}}>
        <h2 className="section-title">Ingresar</h2>
        {err && <div style={{background:'#fee',padding:10,borderRadius:8,marginBottom:12,color:'#800'}}>{err}</div>}
        {info && <div style={{background:'#eef6ff',padding:10,borderRadius:8,marginBottom:12,color:'#244'}}>{info}</div>}
        <div className="form-group"><label>Email</label><input name="email" type="email" required defaultValue="" autoComplete="email" placeholder="tu@email.com" /></div>
        <div className="form-group"><label>Contraseña</label><input name="password" type="password" required defaultValue="" autoComplete="current-password" placeholder="••••••••" /></div>
        <button className="btn" type="submit" style={{width:'100%', borderRadius:'18px', cornerShape:'superellipse(2)', border:'1px solid rgba(255,255,255,0.28)', boxShadow:'0 4px 16px rgba(192,0,110,0.22)'}}>Ingresar y enviar codigo</button>
        <p style={{marginTop:8,textAlign:'center',fontSize:13,opacity:0.7}}>Si no tenés cuenta, contactá a la inmobiliaria para que te den acceso.</p>
      </form>
    </div>
  );
}
