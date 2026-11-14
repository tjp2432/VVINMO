import { useState, memo, lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Link, Navigate, useParams } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthProvider.jsx'
import { useAuth } from './contexts/AuthContext.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import PropertyCard from './components/PropertyCard.jsx'
import { propiedadParaTarjeta, usePropiedades } from './lib/propiedades.js'
import './App.css'
const Login = lazy(()=> import('./pages/Login.jsx'))
const Verify2FA = lazy(()=> import('./pages/Verify2FA.jsx'))
const PropertyDetail = lazy(()=> import('./pages/PropertyDetail.jsx'))
const Propiedades = lazy(()=> import('./pages/Propiedades.jsx'))


const Navbar = memo(function Navbar(){
  const [open, setOpen] = useState(false)
  const { user, logout } = useAuth()
  return (
    <>
      <nav>
        <div className="nav-container">
          <Link to="/" onClick={()=> setOpen(false)} className="logo" style={{ gap: 10, marginLeft: -14, cursor:'pointer' }}>
            <img src="/pdf-logos/logo_horizontal_transp.png" alt="Veronica Villafañe - Inmobiliaria Integral" loading="eager" decoding="async" fetchPriority="high" draggable={false} onDragStart={e=>e.preventDefault()} style={{ height: 52, width: 'auto', display: 'block', position: 'relative', top: 2 }} />
          </Link>
          <button className="hamburger" onClick={() => setOpen(!open)} aria-label="Menú">☰</button>
          <ul className={`nav-links ${open ? 'open' : ''}`}>
            <li><Link to="/propiedades" onClick={() => setOpen(false)}>Propiedades</Link></li>
            <li><a href="/#nosotros" onClick={() => setOpen(false)}>Nosotros</a></li>
            <li><a href="/#contacto" onClick={() => setOpen(false)}>Contacto</a></li>
            {user && (
              <>
                {user.role==='ADMIN' && <li><Link to="/admin" onClick={() => setOpen(false)} style={{color:'#ff3d9a'}}>Panel Admin</Link></li>}
                {user.role==='PROPIETARIO' && <li><Link to="/propietario" onClick={() => setOpen(false)} style={{color:'#ff3d9a'}}>Mi Panel</Link></li>}
                {user.role==='INQUILINO' && <li><Link to="/inquilino" onClick={() => setOpen(false)} style={{color:'#ff3d9a'}}>Mi Panel</Link></li>}
                <li><button onClick={logout} style={{background:'transparent',border:'1px solid #555',color:'#d6d6d6',padding:'6px 12px',borderRadius:20,cursor:'pointer'}}>Salir ({user.role})</button></li>
              </>
            )}
          </ul>
        </div>
      </nav>
      {open && <div onClick={() => setOpen(false)} style={{ display: 'block', position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.38)', zIndex: 1240 }}></div>}
    </>
  )
})

const Home = memo(function Home(){
  const { items } = usePropiedades()
  // Destacadas: las marcadas como destacadas; si no hay, las primeras publicadas.
  const marcadas = items.filter(p => p.featured)
  const destacadas = (marcadas.length ? marcadas : items).slice(0, 3)

  // El formulario no manda nada a ningun servidor: arma el mensaje y abre
  // WhatsApp con el texto ya cargado (+54 9 11 6467-1905).
  function contactoWhatsApp(e){
    e.preventDefault()
    const fd = new FormData(e.target)
    const leer = n => (fd.get(n) || '').toString().trim()
    const lineas = ['Hola Verónica, te escribo desde tu web.']
    const nombre = leer('nombre'), email = leer('email'), tel = leer('telefono'), mensaje = leer('mensaje')
    if (nombre) lineas.push(`Nombre: ${nombre}`)
    if (email)  lineas.push(`Email: ${email}`)
    if (tel)    lineas.push(`Teléfono: ${tel}`)
    if (mensaje) lineas.push('', mensaje)
    window.open(`https://wa.me/5491164671905?text=${encodeURIComponent(lineas.join('\n'))}`, '_blank', 'noopener,noreferrer')
  }
  return (
    <>
      <header className="hero">
        <div>
          <div className="hero-logo-glass" style={{flexDirection:'column', gap:0}}>
            <img src="/pdf-logos/logo_AV_grande_transp.png" alt="Veronica Villafañe - Inmobiliaria Integral" loading="eager" decoding="async" draggable={false} onDragStart={e=>e.preventDefault()} style={{maxWidth:'82%', maxHeight:'82%', width:'auto', height:'auto', objectFit:'contain', display:'block'}} />
          </div>
          <p>Tu inmobiliaria de confianza, conectamos personas con sus sueños. Encontranos en Virrey del Pino 2829, CABA. Lunes a Viernes de 10:00 hs a 19:00 hs.</p>
        </div>
      </header>
      <section className="section" id="inicio" style={{ textAlign: 'center', position:'relative', top:-16 }}>
        <h2 className="section-title">¿Quienes somos?</h2>
        <p style={{ maxWidth: 780, margin: '0 auto', fontSize: '1.1rem' }}>Somos una inmobiliaria comprometida con encontrar el espacio que realmente necesitas. Con años de experiencia en el mercado, ofrecemos un servicio cercano, profesional y transparente. Ya sea que busques comprar tu primera vivienda, invertir en propiedades o alquilar un espacio, estamos aquí para ayudarte en cada paso del proceso.</p>
      </section>
      <section className="section" id="propiedades">
        <h2 className="section-title">Propiedades destacadas</h2>
        <div className="properties-grid">
          {destacadas.map(p => <PropertyCard key={p.id} p={propiedadParaTarjeta(p)} />)}
        </div>
        {destacadas.length === 0 && <p style={{textAlign:'center',opacity:0.6}}>Muy pronto vas a ver acá nuestras propiedades.</p>}
        <div style={{textAlign:'center',marginTop:28}}>
          <Link to="/propiedades" className="btn" style={{background:'rgba(140,0,80,0.85)'}}>Ver más propiedades</Link>
        </div>
      </section>
      <section className="section" id="nosotros" style={{ textAlign: 'center' }}>
        <h2 className="section-title">Nuestra Historia</h2>
        <p style={{ maxWidth: 780, margin: '0 auto' }}>Fundada con el objetivo de ofrecer un servicio inmobiliario de confianza. En Verónica Villafañe, creemos que comprar o vender una propiedad es una de las decisiones más importantes en la vida de una persona, por eso nos esforzamos en construir relaciones duraderas basadas en la honestidad y los resultados.</p>
        <p style={{ maxWidth: 780, margin: '1rem auto 0' }}>Nuestro equipo de profesionales está capacitado para asesorarte con el mejor conocimiento del mercado local, garantizando transparencia en cada transacción.</p>
      </section>
      <section id="contacto">
        <div className="contact-glass">
          <div className="contact-form">
            <h2 className="section-title">Contactanos</h2>
            <form onSubmit={contactoWhatsApp}>
              <div className="form-group"><label htmlFor="c-nombre">Nombre completo</label><input id="c-nombre" name="nombre" placeholder="Tu nombre" required /></div>
              <div className="form-group"><label htmlFor="c-email">Email</label><input id="c-email" name="email" type="email" placeholder="tu@email.com" required /></div>
              <div className="form-group"><label htmlFor="c-tel">Teléfono</label><input id="c-tel" name="telefono" placeholder="+54 9 11 1234-5678" /></div>
              <div className="form-group"><label htmlFor="c-msg">Mensaje</label><textarea id="c-msg" name="mensaje" rows={4} placeholder="Cuéntanos qué propiedad te interesa o cómo podemos ayudarte"></textarea></div>
              <button type="submit" className="btn">Enviar por WhatsApp</button>
              <p className="contact-legal">No almacenamos tus datos en este sitio. Al continuar, serás redirigido a WhatsApp para iniciar el chat directamente con nosotros.</p>
            </form>
          </div>
        </div>
      </section>
      <footer>
        <div className="footer-container">
          <div className="footer-grid">
            <div className="footer-brand"><h3>Verónica Villafañe</h3><p>Tu aliado en el mercado inmobiliario. Con dedicación y profesionalismo, transformamos tus metas en realidad.</p></div>
            <div className="footer-links"><h4>Enlaces</h4><ul><li><Link to="/">Inicio</Link></li><li><Link to="/propiedades">Propiedades</Link></li><li><Link to="/#nosotros">Nosotros</Link></li><li><Link to="/#contacto">Contacto</Link></li></ul></div>
            <div className="footer-contact"><h4>Contacto</h4><ul><li>📞 +54 9 11 6467-1905</li><li>✉️ info@veronicavillafane.com</li><li>📍 Virrey del Pino 2829, CABA, Buenos Aires, Argentina.</li></ul></div>
          </div>
          <div className="footer-bottom"><p>© 2026 Verónica Villafañe - Inmobiliaria Integral. Todos los derechos reservados.</p></div>
        </div>
      </footer>
      <a className="whatsapp-float" href="https://wa.me/5491164671905" target="_blank" aria-label="WhatsApp"><img src="/wpp logo.png" alt="WhatsApp" loading="lazy" decoding="async" draggable={false} onDragStart={e=>e.preventDefault()} style={{ width: 76, height: 76, objectFit: 'contain', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.25))' }} /></a>
    </>
  )
})

export default function App(){
  return (
    <BrowserRouter>
      <AuthProvider>
        <svg width="0" height="0" style={{ position: 'absolute' }}><defs><clipPath id="squircle-20-continuous" clipPathUnits="objectBoundingBox"><path d="M 0.105 0 C 0.04 0 0 0.04 0 0.105 L 0 0.895 C 0 0.96 0.04 1 0.105 1 L 0.895 1 C 0.96 1 1 0.96 1 0.895 L 1 0.105 C 1 0.04 0.96 0 0.895 0 Z" /></clipPath></defs></svg>
        <Navbar />
        <Suspense fallback={<div style={{padding:120,textAlign:'center',opacity:0.6}}>Cargando…</div>}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/propiedades" element={<Propiedades />} />
            <Route path="/propiedad/:id" element={<PropertyDetailRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/verify-2fa" element={<Verify2FA />} />
            <Route path="/admin" element={<ProtectedRoute roles={['ADMIN']}><Suspense fallback={<div style={{padding:40}}>Cargando panel…</div>}><DashWrapper which="admin"/></Suspense></ProtectedRoute>} />
            <Route path="/propietario" element={<ProtectedRoute roles={['PROPIETARIO','ADMIN']}><DashWrapper which="prop"/></ProtectedRoute>} />
            <Route path="/inquilino" element={<ProtectedRoute roles={['INQUILINO','ADMIN']}><DashWrapper which="inq"/></ProtectedRoute>} />
            {/* Cualquier URL desconocida (ej. la vieja /privacidad) vuelve al inicio */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </AuthProvider>
    </BrowserRouter>
  )
}
function PropertyDetailRoute(){
  const { id } = useParams()
  return <PropertyDetail key={id} />
}
function DashWrapper({ which }){
  const [Comp,setComp]=useState(null);
  useEffect(()=>{ import('./pages/Dashboard.jsx').then(m=>{
    if(which==='admin') setComp(()=> m.AdminDashboard);
    else if(which==='prop') setComp(()=> m.PropDashboard);
    else setComp(()=> m.InquilinoDashboard);
  });},[which]);
  if(!Comp) return <div style={{padding:40,textAlign:'center'}}>Cargando panel…</div>;
  return <Comp />;
}
