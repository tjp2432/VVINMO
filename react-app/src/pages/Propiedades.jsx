import { useState } from 'react';
import PropertyCard from '../components/PropertyCard.jsx';
import { LISTADO } from '../data/propiedades.js';

// USD ~ $1400 de referencia solo para ordenar (no es cotización)
const USD_REF = 1400;
function precioNum(p){
  const m = (p.price || '').replace(/\./g, '').match(/[\d,]+/);
  const n = m ? parseFloat(m[0].replace(/,/g, '')) : 0;
  return /USD/i.test(p.price) ? n * USD_REF : n;
}

export default function Propiedades(){
  const [filtro, setFiltro] = useState('todas');
  const [orden, setOrden] = useState('none');
  const items = LISTADO.filter(p => {
    if (filtro === 'todas') return true;
    const op = p.link.includes('/vecl') ? 'venta' : 'alquiler';
    return op === filtro;
  }).sort((a,b) => {
    if (orden === 'asc') return precioNum(a) - precioNum(b);
    if (orden === 'desc') return precioNum(b) - precioNum(a);
    return 0;
  });
  return (
    <div className="section" style={{marginTop:40}}>
      <h2 className="section-title">Propiedades</h2>
      <div className="properties-grid">
        <div className="filters-bar" style={{gridColumn:'1 / -1'}}>
          <div className="filters-group">
            {[['todas','Todas'],['venta','Venta'],['alquiler','Alquiler']].map(([v,l])=>(
              <button key={v} onClick={()=>setFiltro(v)}
                style={{padding:'8px 22px',borderRadius:20,border:'1px solid #c0006e',cursor:'pointer',
                  background: filtro===v ? '#c0006e' : 'transparent',
                  color: filtro===v ? '#fff' : '#c0006e', fontWeight:600}}>{l}</button>
            ))}
          </div>
          <select value={orden} onChange={e=>setOrden(e.target.value)} aria-label="Ordenar por precio"
            style={{padding:'8px 14px',borderRadius:20,border:'1px solid #c0006e',background:'#fff',color:'#c0006e',fontWeight:600,cursor:'pointer',maxWidth:'100%'}}>
            <option value="none">Ordenar: destacadas</option>
            <option value="asc">Precio: menor a mayor</option>
            <option value="desc">Precio: mayor a menor</option>
          </select>
        </div>
        {items.map(p => <PropertyCard key={p.id} p={p} />)}
      </div>
    </div>
  );
}
