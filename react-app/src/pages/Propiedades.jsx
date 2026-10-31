import { useState } from 'react';
import PropertyCard from '../components/PropertyCard.jsx';
import { propiedadParaTarjeta, precioOrden, usePropiedades } from '../lib/propiedades.js';

export default function Propiedades(){
  const { items, loading, error } = usePropiedades();
  const [filtro, setFiltro] = useState('todas');
  const [orden, setOrden] = useState('none');

  const props = items
    .filter(p => filtro === 'todas' || p.type === filtro)
    .slice()
    .sort((a,b) => {
      if (orden === 'asc') return precioOrden(a) - precioOrden(b);
      if (orden === 'desc') return precioOrden(b) - precioOrden(a);
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

        {loading && <p style={{gridColumn:'1 / -1',textAlign:'center',opacity:0.6}}>Cargando propiedades…</p>}
        {error && <p style={{gridColumn:'1 / -1',textAlign:'center',color:'#b00020'}}>No se pudieron cargar las propiedades: {error}</p>}
        {!loading && !error && props.length === 0 && (
          <p style={{gridColumn:'1 / -1',textAlign:'center',opacity:0.6}}>No hay propiedades publicadas por ahora.</p>
        )}

        {props.map(p => <PropertyCard key={p.id} p={propiedadParaTarjeta(p)} />)}
      </div>
    </div>
  );
}
