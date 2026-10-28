import { useAuth } from '../contexts/AuthContext.jsx';
import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

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
export function AdminDashboard(){
  const [props,setProps]=useState([]);
  const [users,setUsers]=useState([]);
  const [contracts,setContracts]=useState([]);
  const [formProp,setFormProp]=useState({ title:'', address:'', price:'', type:'alquiler' });
  const [formContract,setFormContract]=useState({ property_id:'', owner_id:'', tenant_id:'', start_date:'', end_date:'', rent_amount:'' });
  const [formPay,setFormPay]=useState({ contract_id:'', amount:'', due_date:'', method:'transferencia', notes:'' });
  const [file,setFile]=useState(null);
  const [msg,setMsg]=useState('');

  async function loadAll(){
    try{
      const [p,u,c] = await Promise.all([ api('/properties'), api('/admin/users'), api('/contracts') ]);
      setProps(p); setUsers(u); setContracts(c);
    }catch(e){ setMsg(e.message); }
  }
  useEffect(()=>{ loadAll(); },[]);

  const propietarios = users.filter(u=>u.role==='PROPIETARIO');
  const inquilinos = users.filter(u=>u.role==='INQUILINO');

  async function createProp(e){
    e.preventDefault();
    try{ await api('/properties',{method:'POST', body:formProp}); setMsg('Propiedad creada'); setFormProp({title:'',address:'',price:'',type:'alquiler'}); loadAll(); }catch(ex){ setMsg(ex.message); }
  }
  async function assignOwner(propId, ownerId){
    try{ await api(`/admin/properties/${propId}/assign`,{method:'PATCH', body:{owner_id:ownerId}}); setMsg('Propietario asignado'); loadAll(); }catch(ex){ setMsg(ex.message); }
  }
  async function createContract(e){
    e.preventDefault();
    try{ await api('/contracts',{method:'POST', body:{...formContract, rent_amount:Number(formContract.rent_amount)}}); setMsg('Contrato creado - propiedad pasa a alquilada'); loadAll(); }catch(ex){ setMsg(ex.message); }
  }
  async function documentPay(e){
    e.preventDefault();
    try{
      const fd = new FormData();
      fd.append('amount', formPay.amount);
      fd.append('due_date', formPay.due_date);
      fd.append('method', formPay.method);
      if (file) fd.append('receipt', file);
      const res = await fetch(`${API}/api/contracts/${formPay.contract_id}/payments`, { method:'POST', body:fd, credentials:'include' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error||'Error');
      setMsg(`Pago documentado: $${data.amount} - ${data.receipt_url?'con comprobante':'sin comprobante'} (solo documentación, no procesa dinero)`);
      loadAll();
    }catch(ex){ setMsg(ex.message); }
  }

  return (
    <DashboardLayout title="Panel Inmobiliaria (ADMIN)">
      {msg && <div style={{background:'#fff7fb',padding:10,borderRadius:8,marginBottom:12,border:'1px solid #ffd0e8'}}>{msg}</div>}

      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
        {/* Usuarios */}
        <div style={{background:'rgba(255,255,255,0.85)',padding:16,borderRadius:14}}>
          <h3>Usuarios ({users.length}) - RENAPER + 2FA</h3>
          <div style={{maxHeight:260,overflow:'auto',fontSize:13}}>
            {users.map(u=>(
              <div key={u.id} style={{padding:8,borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between'}}>
                <span>{u.nombre} {u.apellido} — {u.email} <br/><small>{u.role} · DNI ***{u.dni_last4} · {u.renaper_status} · {u.email_verified?'✓ mail':'pend mail'}</small></span>
                <span style={{opacity:0.6,fontSize:11}}>{new Date(u.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Crear propiedad */}
        <div style={{background:'rgba(255,255,255,0.85)',padding:16,borderRadius:14}}>
          <h3>Crear propiedad</h3>
          <form onSubmit={createProp} style={{display:'grid',gap:8}}>
            <input placeholder="Título" required value={formProp.title} onChange={e=>setFormProp({...formProp,title:e.target.value})} style={inp} />
            <input placeholder="Dirección" required value={formProp.address} onChange={e=>setFormProp({...formProp,address:e.target.value})} style={inp} />
            <input placeholder="Precio (ej: $850.000)" required value={formProp.price} onChange={e=>setFormProp({...formProp,price:e.target.value})} style={inp} />
            <select value={formProp.type} onChange={e=>setFormProp({...formProp,type:e.target.value})} style={inp}><option value="alquiler">Alquiler</option><option value="venta">Venta</option></select>
            <button className="btn" type="submit">Crear</button>
          </form>
        </div>
      </div>

      {/* Propiedades + asignar */}
      <div style={{background:'rgba(255,255,255,0.85)',padding:16,borderRadius:14,marginTop:16}}>
        <h3>Propiedades ({props.length}) - Asignar propietario</h3>
        {props.map(p=>(
          <div key={p.id} style={{padding:10,borderBottom:'1px solid #eee',display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:8}}>
            <span><b>{p.title}</b> — {p.address} — {p.price} <small style={{opacity:0.6}}>[{p.status}] {p.owner_id?'· Propietario asignado':'· Sin propietario'}</small></span>
            <select onChange={e=> e.target.value && assignOwner(p.id, e.target.value)} defaultValue="" style={{padding:'6px 10px',borderRadius:8}}>
              <option value="">Asignar propietario...</option>
              {propietarios.map(pr=> <option key={pr.id} value={pr.id}>{pr.nombre} {pr.apellido} ({pr.email})</option>)}
            </select>
          </div>
        ))}
      </div>

      {/* Crear contrato */}
      <div style={{background:'rgba(255,255,255,0.85)',padding:16,borderRadius:14,marginTop:16}}>
        <h3>Crear contrato (vincula propiedad + propietario + inquilino) - Solo documentación</h3>
        <form onSubmit={createContract} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
          <select required value={formContract.property_id} onChange={e=>setFormContract({...formContract,property_id:e.target.value})} style={inp}><option value="">Propiedad...</option>{props.filter(p=>p.status==='disponible').map(p=> <option key={p.id} value={p.id}>{p.title} - {p.address}</option>)}</select>
          <select required value={formContract.owner_id} onChange={e=>setFormContract({...formContract,owner_id:e.target.value})} style={inp}><option value="">Propietario...</option>{propietarios.map(u=> <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}</select>
          <select required value={formContract.tenant_id} onChange={e=>setFormContract({...formContract,tenant_id:e.target.value})} style={inp}><option value="">Inquilino...</option>{inquilinos.map(u=> <option key={u.id} value={u.id}>{u.nombre} {u.apellido}</option>)}</select>
          <input type="date" required value={formContract.start_date} onChange={e=>setFormContract({...formContract,start_date:e.target.value})} style={inp} />
          <input type="date" required value={formContract.end_date} onChange={e=>setFormContract({...formContract,end_date:e.target.value})} style={inp} />
          <input placeholder="Monto alquiler ARS" type="number" required value={formContract.rent_amount} onChange={e=>setFormContract({...formContract,rent_amount:e.target.value})} style={inp} />
          <button className="btn" type="submit" style={{gridColumn:'1 / -1'}}>Crear contrato</button>
        </form>
      </div>

      {/* Contratos y documentar pagos */}
      <div style={{background:'rgba(255,255,255,0.85)',padding:16,borderRadius:14,marginTop:16}}>
        <h3>Contratos ({contracts.length}) y documentación de pagos</h3>
        {contracts.map(c=>(
          <div key={c.id} style={{padding:12,border:'1px solid #eee',borderRadius:10,marginBottom:10}}>
            <div><b>{c.property?.title}</b> — {c.property?.address} — ${c.rent_amount} {c.currency} — {c.status}</div>
            <div style={{fontSize:12,opacity:0.7}}>Propietario: {c.owner_id} · Inquilino: {c.tenant_id} · {new Date(c.start_date).toLocaleDateString()} → {new Date(c.end_date).toLocaleDateString()}</div>
            <div style={{fontSize:12,marginTop:6}}>Pagos documentados: {c.payments?.length||0} {c.payments?.map(p=> <span key={p.id} style={{marginLeft:8,background:'#eef6ff',padding:'2px 6px',borderRadius:6}}>${p.amount} {p.status} {p.receipt_url?'📎':''}</span>)}</div>
          </div>
        ))}
        <form onSubmit={documentPay} style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12,background:'#fff7fb',padding:12,borderRadius:10}}>
          <select required value={formPay.contract_id} onChange={e=>setFormPay({...formPay,contract_id:e.target.value})} style={inp}><option value="">Contrato...</option>{contracts.map(c=> <option key={c.id} value={c.id}>{c.property?.title} - ${c.rent_amount}</option>)}</select>
          <input type="number" placeholder="Monto" required value={formPay.amount} onChange={e=>setFormPay({...formPay,amount:e.target.value})} style={inp} />
          <input type="date" required value={formPay.due_date} onChange={e=>setFormPay({...formPay,due_date:e.target.value})} style={inp} />
          <select value={formPay.method} onChange={e=>setFormPay({...formPay,method:e.target.value})} style={inp}><option>transferencia</option><option>efectivo</option><option>cheque</option></select>
          <input type="file" accept=".jpg,.png,.pdf" onChange={e=>setFile(e.target.files[0])} style={{gridColumn:'1 / -1'}} />
          <small style={{gridColumn:'1 / -1',opacity:0.6}}>Comprobante (JPG/PNG/PDF, max 8MB) - se guarda en /uploads/receipts y se referencia como documentación. En prod se encripta AES antes de subir a S3.</small>
          <button className="btn" type="submit" style={{gridColumn:'1 / -1'}}>Documentar pago (solo registro)</button>
        </form>
      </div>
    </DashboardLayout>
  );
}

const inp = { padding:'10px 12px', borderRadius:10, border:'1px solid #ddd', width:'100%', boxSizing:'border-box' };

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
