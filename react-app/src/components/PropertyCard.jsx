import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';

export default function PropertyCard({ p }){
  const ref = useRef(null);
  const [visible,setVisible]=useState(false);
  useEffect(()=>{
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e])=>{ if(e.isIntersecting){ setVisible(true); io.disconnect(); }},{ rootMargin:'200px'});
    io.observe(el);
    return ()=> io.disconnect();
  },[]);
  return (
    <div className="property-card" ref={ref}>
      <Link to={`/propiedad/${p.id}`} className="property-img" style={{ background: visible ? `url('${p.img}') center/cover` : '#e8e0d0', contain:'paint' }}></Link>
      <div className="property-content">
        <span className="property-price">{p.price}</span>
        <h3><Link to={`/propiedad/${p.id}`}>{p.title}</Link></h3>
        <p>{p.desc} <a href={p.link} target="_blank" rel="noreferrer" style={{ color: '#c0006e', fontWeight: 600 }}>Ver ficha</a></p>
      </div>
    </div>
  );
}
