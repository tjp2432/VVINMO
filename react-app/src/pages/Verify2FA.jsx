import { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext.jsx';

export default function Verify2FA(){
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { verify2FA } = useAuth();
  const email = params.get('email') || '';
  const purpose = params.get('purpose') || 'login';
  // En desarrollo (sin SMTP) el backend devuelve el código de 6 dígitos y lo
  // pasamos por la URL para mostrarlo acá, así se puede copiar sin apuro.
  const devCode = params.get('dev') || '';
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
        <p style={{textAlign:'center',marginBottom:12}}>Enviamos un código de 6 dígitos a <b>{email}</b>.</p>
        {devCode && (
          <div style={{background:'#fff8e1',border:'1px solid #f0d27a',padding:12,borderRadius:8,marginBottom:12,color:'#5a4600',textAlign:'center'}}>
            <div style={{fontSize:13,marginBottom:4}}>Modo DEV (todavía no hay envío de mails): tu código es</div>
            <div style={{fontSize:26,fontWeight:700,letterSpacing:6}}>{devCode}</div>
            <button type="button" onClick={()=>setCode(devCode)}
              style={{marginTop:8,background:'#5a4600',color:'#fff',border:0,borderRadius:8,padding:'6px 14px',cursor:'pointer',fontSize:13}}>
              Usar este código
            </button>
          </div>
        )}
        {err && <div style={{background:'#fee',padding:10,borderRadius:8,marginBottom:12,color:'#800'}}>{err}</div>}
        {ok && <div style={{background:'#e6ffed',padding:10,borderRadius:8,marginBottom:12,color:'#144'}}>{ok}</div>}
        <div className="form-group"><label>Código 6 dígitos</label><input required value={code} onChange={e=>setCode(e.target.value)} placeholder="123456" maxLength={6} style={{letterSpacing:6,textAlign:'center',fontSize:20}} /></div>
        <button className="btn" type="submit" style={{width:'100%'}}>Verificar</button>
      </form>
    </div>
  );
}
