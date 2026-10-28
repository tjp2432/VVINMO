import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Verify2FA(){
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { verify2FA } = useAuth();
  const email = params.get('email') || '';
  const purpose = params.get('purpose') || 'login';
  const [code,setCode]=useState(''); const [err,setErr]=useState(''); const [ok,setOk]=useState('');

  async function submit(e){
    e.preventDefault(); setErr('');
    try{
      const r = await verify2FA(email, code, purpose);
      setOk(`Verificado! Rol: ${r.role}. Redirigiendo…`);
      setTimeout(()=>{
        if (r.role==='ADMIN') nav('/admin');
        else if (r.role==='PROPIETARIO') nav('/propietario');
        else nav('/inquilino');
      }, 700);
    }catch(ex){ setErr(ex.message); }
  }

  return (
    <div className="auth-page">
      <form onSubmit={submit} className="contact-glass" style={{margin:'90px auto'}}>
        <h2 className="section-title">Verificación 2FA</h2>
        <p style={{textAlign:'center',marginBottom:12}}>Enviamos un código de 6 dígitos a <b>{email}</b> (mail/SMS). Revisa la consola del backend en dev.</p>
        {err && <div style={{background:'#fee',padding:10,borderRadius:8,marginBottom:12,color:'#800'}}>{err}</div>}
        {ok && <div style={{background:'#e6ffed',padding:10,borderRadius:8,marginBottom:12,color:'#144'}}>{ok}</div>}
        <div className="form-group"><label>Código 6 dígitos</label><input required value={code} onChange={e=>setCode(e.target.value)} placeholder="123456" maxLength={6} style={{letterSpacing:6,textAlign:'center',fontSize:20}} /></div>
        <button className="btn" type="submit" style={{width:'100%'}}>Verificar</button>
      </form>
    </div>
  );
}
