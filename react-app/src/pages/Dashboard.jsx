import { useAuth } from '../contexts/AuthContext.jsx';
import { useEffect, useState } from 'react';
import { api, API } from '../lib/api.js';
import AdminPropiedades from './AdminPropiedades.jsx';

function DashboardLayout({ title, children }){
  const { user, logout } = useAuth();
  return (
    <div style={{maxWidth:1100,margin:'80px auto',padding:'0 5%'}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <h2>{title} — <span style={{color:'#c0006e'}}>{user?.role}</span> {user?.nombre}</h2>
        <button onClick={logout} style={{padding:'8px 16px',borderRadius:8,border:'1px solid #ccc',background:'#fff',cursor:'pointer'}}>Cerrar sesión</button>
      </div>
      {children}
    </div>
  );
}

// -------- ADMIN --------
// El panel del administrador queda acotado a la gestion de propiedades
// (crear, editar, publicar, destacar, borrar y subir fotos). Las secciones de
// usuarios, contratos y pagos se retiraron; el backend sigue teniendo esas
// rutas por si se retoman mas adelante.
export function AdminDashboard(){
  return (
    <DashboardLayout title="Panel Inmobiliaria (ADMIN)">
      <AdminPropiedades />
    </DashboardLayout>
  );
}

// -------- PROPIETARIO --------
export function PropDashboard(){
  const [contracts,setContracts]=useState([]);
  useEffect(()=>{ api('/contracts').then(setContracts).catch(()=>{}); },[]);
  return (
    <DashboardLayout title="Panel Propietario">
      <div style={{background:'rgba(255,255,255,0.85)',padding:16,borderRadius:14}}>
        <h3>Mis contratos ({contracts.length})</h3>
        <p style={{opacity:0.7,fontSize:13}}>Ves solo tus contratos. Liquidación y documentación de pagos (no procesamos dinero, solo registramos).</p>
        {contracts.map(c=>(
          <div key={c.id} style={{padding:12,border:'1px solid #eee',borderRadius:10,marginBottom:10}}>
            <b>{c.property?.title}</b> — {c.property?.address} — ${c.rent_amount} {c.currency}<br/>
            <small>Inquilino ID: {c.tenant_id} · {new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()} · {c.status}</small>
            <div style={{marginTop:6,display:'flex',gap:6,flexWrap:'wrap'}}>
              {(c.payments||[]).map(p=> <span key={p.id} style={{background:p.status==='pagado'?'#e6ffed':'#fff3cd',padding:'4px 8px',borderRadius:8,fontSize:12}}>${p.amount} — {p.status} — {new Date(p.due_date).toLocaleDateString()} {p.receipt_url && <a href={`${API}${p.receipt_url}`} target="_blank" style={{color:'#c0006e'}}>📎 comprobante</a>}</span>)}
              {(!c.payments||c.payments.length===0) && <small style={{opacity:0.6}}>Sin pagos documentados aún</small>}
            </div>
          </div>
        ))}
        {contracts.length===0 && <p style={{opacity:0.6}}>Aún no tenés contratos asignados. El ADMIN te asignará cuando haya un alquiler.</p>}
      </div>
    </DashboardLayout>
  );
}

// -------- INQUILINO --------
export function InquilinoDashboard(){
  const [contracts,setContracts]=useState([]);
  useEffect(()=>{ api('/contracts').then(setContracts).catch(()=>{}); },[]);
  return (
    <DashboardLayout title="Panel Inquilino">
      <div style={{background:'rgba(255,255,255,0.85)',padding:16,borderRadius:14}}>
        <h3>Mi contrato</h3>
        {contracts.map(c=>(
          <div key={c.id} style={{padding:12,border:'1px solid #eee',borderRadius:10,marginBottom:10}}>
            <b>{c.property?.title}</b> — {c.property?.address}<br/>
            <small>Vigencia: {new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()} · ${c.rent_amount} {c.currency} · {c.status}</small>
            <div style={{marginTop:8}}>
              <h4 style={{margin:'6px 0'}}>Documentación de pagos</h4>
              {(c.payments||[]).map(p=> <div key={p.id} style={{display:'flex',justifyContent:'space-between',padding:'6px 0',borderBottom:'1px dashed #eee',fontSize:13}}><span>{new Date(p.due_date).toLocaleDateString()} — ${p.amount} ({p.method}) — {p.status}</span>{p.receipt_url && <a href={`${API}${p.receipt_url}`} target="_blank" style={{color:'#c0006e'}}>Ver comprobante</a>}</div>)}
              {(!c.payments||c.payments.length===0) && <small style={{opacity:0.6}}>Sin pagos documentados. El ADMIN registra cada pago como documentación.</small>}
            </div>
            <p style={{marginTop:10,fontSize:12,opacity:0.6}}>Nota: los pagos no se procesan en la web, solo se documentan con fecha, monto y comprobante encriptado para trazabilidad Ley 25.326.</p>
          </div>
        ))}
        {contracts.length===0 && <p style={{opacity:0.6}}>No tenés contrato vigente. Contactá a la inmobiliaria.</p>}
      </div>
    </DashboardLayout>
  );
}
