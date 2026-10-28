import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PROPIEDADES, getPhotos } from '../data/propiedades.js';

export default function PropertyDetail(){
  const { id } = useParams();
  const data = PROPIEDADES[id];
  const photos = data ? getPhotos(id) : [];
  const [idx, setIdx] = useState(0);

  useEffect(()=>{ setIdx(0); window.scrollTo(0,0); },[id]);

  const prev = useCallback(()=> setIdx(i => (i - 1 + photos.length) % photos.length),[photos.length]);
  const next = useCallback(()=> setIdx(i => (i + 1) % photos.length),[photos.length]);

  useEffect(()=>{
    const h = e => { if(e.key==='ArrowLeft') prev(); if(e.key==='ArrowRight') next(); };
    window.addEventListener('keydown', h);
    return ()=> window.removeEventListener('keydown', h);
  },[prev,next]);

  if (!data) return (
    <div style={{maxWidth:800,margin:'100px auto',padding:'0 5%',textAlign:'center'}}>
      <h2>Propiedad no encontrada</h2>
      <p style={{opacity:0.7}}>El aviso ya no está disponible.</p>
      <Link to="/" className="btn" style={{marginTop:16}}>Volver a propiedades</Link>
    </div>
  );

  return (
    <div style={{maxWidth:1100,margin:'80px auto 40px',padding:'0 5%'}}>
      <Link to="/#propiedades" style={{color:'#c0006e',fontWeight:600}}>← Volver a propiedades</Link>
      <div style={{display:'flex',gap:10,alignItems:'center',margin:'12px 0',flexWrap:'wrap'}}>
        <span style={{background: data.operation==='Venta' ? '#c0006e' : '#2d3e50', color:'#fff', padding:'4px 14px', borderRadius:20, fontSize:13, fontWeight:700}}>{data.operation}</span>
        <h1 style={{margin:0,fontSize:'1.6rem'}}>{data.title}</h1>
      </div>
      <p style={{opacity:0.7,margin:'0 0 16px'}}>📍 {data.address}</p>

      {/* Carrusel */}
      <div style={{position:'relative',borderRadius:20,overflow:'hidden',background:'#e8e0d0',contain:'paint'}}>
        <img src={photos[idx]} alt={`${data.title} foto ${idx+1}`} loading="eager" decoding="async" draggable={false} onDragStart={e=>e.preventDefault()}
          style={{width:'100%',height:'min(62vh,520px)',objectFit:'cover',display:'block'}} />
        {photos.length>1 && <>
          <button onClick={prev} aria-label="Anterior" style={arrow('left')}>‹</button>
          <button onClick={next} aria-label="Siguiente" style={arrow('right')}>›</button>
          <span style={{position:'absolute',bottom:12,right:14,background:'rgba(0,0,0,0.55)',color:'#fff',padding:'3px 12px',borderRadius:14,fontSize:13}}>{idx+1} / {photos.length}</span>
        </>}
      </div>

      {/* Miniaturas */}
      {photos.length>1 && (
        <div style={{display:'flex',gap:8,marginTop:10,overflowX:'auto',paddingBottom:4}}>
          {photos.map((p,i)=>(
            <img key={p} src={p} alt={`mini ${i+1}`} loading="lazy" decoding="async" draggable={false} onDragStart={e=>e.preventDefault()} onClick={()=>setIdx(i)}
              style={{width:86,height:64,objectFit:'cover',borderRadius:10,cursor:'pointer',border: i===idx?'3px solid #c0006e':'3px solid transparent',flexShrink:0}} />
          ))}
        </div>
      )}

      <div style={{display:'grid',gridTemplateColumns:'1fr 340px',gap:20,marginTop:20}} className="detail-grid">
        <div style={{background:'rgba(255,255,255,0.85)',padding:20,borderRadius:16}}>
          <h3 style={{marginTop:0}}>Descripción</h3>
          <p style={{lineHeight:1.7}}>{data.description}</p>
          <h3>Características</h3>
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {data.features.map(f=> <span key={f} style={{background:'#f7ede0',border:'1px solid #e5d9c5',padding:'5px 12px',borderRadius:16,fontSize:13}}>{f}</span>)}
          </div>
        </div>
        <div style={{background:'#121214',color:'#e8e8e8',padding:20,borderRadius:16,height:'fit-content'}}>
          <div style={{fontSize:'1.7rem',fontWeight:800,color:'#ff5fa2'}}>{data.price}</div>
          {data.expensas && <div style={{opacity:0.8,fontSize:14,marginTop:4}}>+ {data.expensas} expensas</div>}
          <div style={{marginTop:8,fontSize:14,opacity:0.85}}>{data.operation} · {data.address}</div>
          <a href={data.link} target="_blank" rel="noreferrer" className="btn" style={{display:'block',textAlign:'center',marginTop:16,borderRadius:18}}>Ver ficha en Zonaprop</a>
          <a href="https://wa.me/5491164671905" target="_blank" rel="noreferrer" style={{display:'block',textAlign:'center',marginTop:10,padding:'0.8rem 2rem',borderRadius:18,border:'1px solid #4a5568',fontWeight:600}}>Consultar por WhatsApp</a>
        </div>
      </div>
    </div>
  );
}

const arrow = side => ({ position:'absolute', top:'50%', [side]:12, transform:'translateY(-50%)', width:44, height:44, borderRadius:'50%', border:'none', background:'rgba(0,0,0,0.5)', color:'#fff', fontSize:26, cursor:'pointer', lineHeight:1 });
