import { useEffect, useMemo, useRef, useState } from 'react';
import { api, apiUpload } from '../lib/api.js';
import { formatPrecio } from '../lib/propiedades.js';

const VACIO = {
  title: '', type: 'alquiler', property_type: 'departamento',
  price: '', currency: 'ARS', expenses: '',
  address: '', neighborhood: '', city: 'CABA',
  rooms: '', bedrooms: '', bathrooms: '', garage: '',
  area_m2: '', area_covered_m2: '',
  description: '', features: [],
  external_link: '', featured: false, published: true,
  images: [],
};

const TIPOS = [
  ['departamento', 'Departamento'],
  ['casa', 'Casa'],
  ['ph', 'PH'],
  ['oficina', 'Oficina'],
  ['local', 'Local'],
  ['terreno', 'Terreno'],
  ['cochera', 'Cochera'],
];

// Convierte la propiedad de la API al estado del formulario.
function aFormulario(p) {
  return {
    ...VACIO,
    ...p,
    features: Array.isArray(p.features) ? p.features : [],
    images: Array.isArray(p.images) ? p.images : [],
    rooms: p.rooms ?? '', bedrooms: p.bedrooms ?? '', bathrooms: p.bathrooms ?? '',
    garage: p.garage ?? '', area_m2: p.area_m2 ?? '', area_covered_m2: p.area_covered_m2 ?? '',
  };
}

const inp = { padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', width: '100%', boxSizing: 'border-box', font: 'inherit' };
const label = { display: 'grid', gap: 4, fontSize: 13, fontWeight: 600, color: '#444' };
const h4 = { margin: '0 0 10px', fontSize: 15 };

export default function AdminPropiedades() {
  const [lista, setLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');
  const [abierto, setAbierto] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(VACIO);
  const [subiendo, setSubiendo] = useState(false);
  const [urlNueva, setUrlNueva] = useState('');
  const fileRef = useRef(null);

  function cargar() {
    setCargando(true);
    api('/properties/admin/all')
      .then(data => setLista(Array.isArray(data) ? data : []))
      .catch(e => setError(e.message))
      .finally(() => setCargando(false));
  }

  useEffect(() => {
    const t = setTimeout(cargar, 0);
    return () => clearTimeout(t);
  }, []);

  function nueva() {
    setEditId(null);
    setForm({ ...VACIO });
    setAbierto(true);
    setMsg('');
    setError('');
  }

  function editar(p) {
    setEditId(p.id);
    setForm(aFormulario(p));
    setAbierto(true);
    setMsg('');
    setError('');
  }

  function cerrar() {
    setAbierto(false);
    setEditId(null);
    setForm({ ...VACIO });
    if (fileRef.current) fileRef.current.value = '';
  }

  const set = (campo, valor) => setForm(f => ({ ...f, [campo]: valor }));

  async function subirArchivos(files) {
    if (!files || !files.length) return;
    setSubiendo(true); setError('');
    try {
      const fd = new FormData();
      [...files].forEach(f => fd.append('images', f));
      const { urls } = await apiUpload('/properties/images', fd);
      setForm(f => ({ ...f, images: [...f.images, ...urls] }));
    } catch (e) {
      setError(e.message);
    } finally {
      setSubiendo(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function agregarUrl() {
    const url = urlNueva.trim();
    if (!url) return;
    set('images', [...form.images, url]);
    setUrlNueva('');
  }

  function quitarImagen(i) {
    set('images', form.images.filter((_, idx) => idx !== i));
  }

  function moverImagen(i, dir) {
    const j = i + dir;
    if (j < 0 || j >= form.images.length) return;
    const copia = [...form.images];
    [copia[i], copia[j]] = [copia[j], copia[i]];
    set('images', copia);
  }

  async function guardar(e) {
    e.preventDefault();
    setMsg(''); setError('');
    const payload = {
      ...form,
      features: form.features,
      images: form.images,
    };
    try {
      if (editId) await api(`/properties/${editId}`, { method: 'PUT', body: payload });
      else await api('/properties', { method: 'POST', body: payload });
      setMsg(editId ? 'Propiedad actualizada' : 'Propiedad creada');
      cerrar();
      cargar();
    } catch (ex) {
      setError(ex.message);
    }
  }

  async function alternar(p, campo) {
    setError(''); setMsg('');
    try {
      await api(`/properties/${p.id}`, { method: 'PUT', body: { [campo]: !p[campo] } });
      cargar();
    } catch (ex) { setError(ex.message); }
  }

  async function eliminar(p) {
    if (!confirm(`¿Eliminar "${p.title}"? Esta acción no se puede deshacer.`)) return;
    setError(''); setMsg('');
    try {
      await api(`/properties/${p.id}`, { method: 'DELETE' });
      setMsg('Propiedad eliminada');
      cargar();
    } catch (ex) { setError(ex.message); }
  }

  const destacadas = useMemo(() => lista.filter(p => p.featured).length, [lista]);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0 }}>Propiedades ({lista.length})</h3>
          <small style={{ opacity: 0.65 }}>{lista.filter(p => p.published).length} publicadas · {destacadas} destacadas en el inicio</small>
        </div>
        <button className="btn" onClick={nueva} style={{ cursor: 'pointer' }}>+ Nueva propiedad</button>
      </div>

      {msg && <div style={{ background: '#eafaf0', border: '1px solid #b8e6c9', padding: 10, borderRadius: 8, marginBottom: 12 }}>{msg}</div>}
      {error && <div style={{ background: '#fff1f1', border: '1px solid #f2c2c2', color: '#a11', padding: 10, borderRadius: 8, marginBottom: 12 }}>{error}</div>}

      {abierto && (
        <form onSubmit={guardar} style={{ background: 'rgba(255,255,255,0.95)', padding: 18, borderRadius: 14, marginBottom: 20, border: '1px solid #f0d5e4', display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
            <h3 style={{ margin: 0 }}>{editId ? 'Editar propiedad' : 'Nueva propiedad'}</h3>
            <button type="button" onClick={cerrar} style={{ border: 'none', background: 'transparent', fontSize: 22, cursor: 'pointer', lineHeight: 1 }} aria-label="Cerrar">×</button>
          </div>

          {/* Datos principales */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
            <label style={{ ...label, gridColumn: '1 / -1' }}>Título *
              <input style={inp} required value={form.title} onChange={e => set('title', e.target.value)} placeholder="Ej: 2 Amb con balcón - Villa Urquiza" />
            </label>
            <label style={label}>Operación *
              <select style={inp} value={form.type} onChange={e => set('type', e.target.value)}>
                <option value="venta">Venta</option>
                <option value="alquiler">Alquiler</option>
              </select>
            </label>
            <label style={label}>Tipo de propiedad
              <select style={inp} value={form.property_type} onChange={e => set('property_type', e.target.value)}>
                {TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <label style={label}>Estado
              <select style={inp} value={form.status || 'disponible'} onChange={e => set('status', e.target.value)}>
                <option value="disponible">Disponible</option>
                <option value="reservada">Reservada</option>
                <option value="alquilada">Alquilada</option>
                <option value="vendida">Vendida</option>
              </select>
            </label>
            <label style={label}>Moneda
              <select style={inp} value={form.currency} onChange={e => set('currency', e.target.value)}>
                <option value="ARS">Pesos (ARS)</option>
                <option value="USD">Dólares (USD)</option>
              </select>
            </label>
            <label style={label}>Precio *
              <input style={inp} required value={form.price} onChange={e => set('price', e.target.value)} placeholder="249.000 o Consultar" />
            </label>
            <label style={label}>Expensas
              <input style={inp} value={form.expenses} onChange={e => set('expenses', e.target.value)} placeholder="$ 230.000 (opcional)" />
            </label>
          </div>

          {/* Ubicación */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(210px,1fr))', gap: 12 }}>
            <label style={{ ...label, gridColumn: '1 / -1' }}>Dirección *
              <input style={inp} required value={form.address} onChange={e => set('address', e.target.value)} placeholder="Av. Triunvirato 3935" />
            </label>
            <label style={label}>Barrio
              <input style={inp} value={form.neighborhood} onChange={e => set('neighborhood', e.target.value)} placeholder="Villa Urquiza" />
            </label>
            <label style={label}>Ciudad
              <input style={inp} value={form.city} onChange={e => set('city', e.target.value)} placeholder="CABA" />
            </label>
          </div>

          {/* Medidas */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12 }}>
            <label style={label}>Ambientes
              <input style={inp} type="number" min="0" value={form.rooms} onChange={e => set('rooms', e.target.value)} />
            </label>
            <label style={label}>Dormitorios
              <input style={inp} type="number" min="0" value={form.bedrooms} onChange={e => set('bedrooms', e.target.value)} />
            </label>
            <label style={label}>Baños
              <input style={inp} type="number" min="0" value={form.bathrooms} onChange={e => set('bathrooms', e.target.value)} />
            </label>
            <label style={label}>Cocheras
              <input style={inp} type="number" min="0" value={form.garage} onChange={e => set('garage', e.target.value)} />
            </label>
            <label style={label}>M² totales
              <input style={inp} type="number" min="0" step="0.01" value={form.area_m2} onChange={e => set('area_m2', e.target.value)} />
            </label>
            <label style={label}>M² cubiertos
              <input style={inp} type="number" min="0" step="0.01" value={form.area_covered_m2} onChange={e => set('area_covered_m2', e.target.value)} />
            </label>
          </div>

          {/* Textos */}
          <label style={label}>Descripción
            <textarea style={{ ...inp, minHeight: 110, resize: 'vertical' }} value={form.description || ''} onChange={e => set('description', e.target.value)} placeholder="Detalle de la propiedad, ambientes, ubicación, etc." />
          </label>

          <label style={label}>Características (una por línea)
            <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={form.features.join('\n')}
              onChange={e => set('features', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))}
              placeholder={'136 m² tot.\n4 amb.\n3 dorm.\n1 baño'} />
          </label>

          <label style={label}>Link externo (Zonaprop u otro portal)
            <input style={inp} value={form.external_link || ''} onChange={e => set('external_link', e.target.value)} placeholder="https://..." />
          </label>

          {/* Publicación */}
          <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap', fontSize: 14 }}>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!form.published} onChange={e => set('published', e.target.checked)} /> Publicada en la web
            </label>
            <label style={{ display: 'flex', gap: 8, alignItems: 'center', cursor: 'pointer' }}>
              <input type="checkbox" checked={!!form.featured} onChange={e => set('featured', e.target.checked)} /> Destacada en el inicio
            </label>
          </div>

          {/* Imágenes */}
          <div style={{ borderTop: '1px solid #eee', paddingTop: 14 }}>
            <h4 style={h4}>Fotos ({form.images.length})</h4>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              <label style={{ ...label, flex: '1 1 240px' }}>Subir fotos
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple
                  onChange={e => subirArchivos(e.target.files)} style={{ fontSize: 13 }} />
              </label>
              <label style={{ ...label, flex: '1 1 240px' }}>Agregar por URL
                <div style={{ display: 'flex', gap: 6 }}>
                  <input style={inp} value={urlNueva} onChange={e => setUrlNueva(e.target.value)} placeholder="/propiedades/xxx/01.jpg" />
                  <button type="button" onClick={agregarUrl} style={{ ...inp, width: 'auto', cursor: 'pointer' }}>+</button>
                </div>
              </label>
            </div>
            {subiendo && <p style={{ fontSize: 13, opacity: 0.7 }}>Subiendo fotos…</p>}
            <p style={{ fontSize: 12, opacity: 0.6, marginTop: -4 }}>JPG, PNG o WEBP · hasta 8 MB por foto · la primera es la portada.</p>

            {form.images.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))', gap: 10 }}>
                {form.images.map((url, i) => (
                  <div key={`${url}-${i}`} style={{ position: 'relative', borderRadius: 10, overflow: 'hidden', border: i === 0 ? '3px solid #c0006e' : '1px solid #eee', background: '#f4f1ec' }}>
                    <img src={url} alt={`Foto ${i + 1}`} style={{ width: '100%', height: 90, objectFit: 'cover', display: 'block' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: 3, gap: 2 }}>
                      <button type="button" onClick={() => moverImagen(i, -1)} title="Mover izquierda" style={miniBtn}>←</button>
                      <button type="button" onClick={() => moverImagen(i, 1)} title="Mover derecha" style={miniBtn}>→</button>
                      <button type="button" onClick={() => quitarImagen(i)} title="Quitar" style={{ ...miniBtn, color: '#b00020' }}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button type="button" onClick={cerrar} style={{ ...inp, width: 'auto', cursor: 'pointer', background: '#fff' }}>Cancelar</button>
            <button className="btn" type="submit" disabled={subiendo} style={{ width: 'auto', cursor: 'pointer', opacity: subiendo ? 0.6 : 1 }}>
              {editId ? 'Guardar cambios' : 'Crear propiedad'}
            </button>
          </div>
        </form>
      )}

      {/* Listado */}
      <div style={{ background: 'rgba(255,255,255,0.9)', padding: 14, borderRadius: 14 }}>
        {cargando && <p style={{ opacity: 0.6, margin: 0 }}>Cargando propiedades…</p>}
        {!cargando && lista.length === 0 && <p style={{ opacity: 0.6, margin: 0 }}>Todavía no cargaste propiedades. Usá “+ Nueva propiedad”.</p>}
        {lista.map(p => (
          <div key={p.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '10px 0', borderBottom: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
            <div style={{ width: 74, height: 56, borderRadius: 8, overflow: 'hidden', background: '#eee', flexShrink: 0 }}>
              {p.images?.[0] && <img src={p.images[0]} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
            </div>
            <div style={{ flex: '1 1 260px', minWidth: 200 }}>
              <b>{p.title}</b>
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                {p.address} · {formatPrecio(p)} · {p.type === 'venta' ? 'Venta' : 'Alquiler'}
              </div>
              <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {!p.published && <span style={chip('#fff3cd', '#8a6d00')}>Borrador</span>}
                {p.featured && <span style={chip('#ffe6f2', '#b0005f')}>Destacada</span>}
                <span style={chip('#eef2ff', '#3344aa')}>{p.status}</span>
                <span style={chip('#f3f3f3', '#555')}>{p.images?.length || 0} foto(s)</span>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={() => editar(p)} style={accion}>Editar</button>
              <button type="button" onClick={() => alternar(p, 'published')} style={accion}>{p.published ? 'Despublicar' : 'Publicar'}</button>
              <button type="button" onClick={() => alternar(p, 'featured')} style={accion}>{p.featured ? 'Quitar destacada' : 'Destacar'}</button>
              <button type="button" onClick={() => eliminar(p)} style={{ ...accion, color: '#b00020', borderColor: '#f2c2c2' }}>Eliminar</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const miniBtn = { flex: 1, border: 'none', background: '#fff', cursor: 'pointer', fontSize: 12, padding: '2px 0' };
const accion = { padding: '7px 12px', borderRadius: 8, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 13 };
const chip = (bg, color) => ({ background: bg, color, borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700 });
