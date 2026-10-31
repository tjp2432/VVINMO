import { useEffect, useState } from 'react';
import { api } from './api.js';

// USD de referencia solo para ordenar la lista (no es cotización).
const USD_REF = 1400;

// El panel guarda el precio pelado (ej. "249.000") y la moneda por separado.
// Si ya viene con símbolo o letras se respeta tal cual.
export function formatPrecio(p) {
  const raw = (p?.price ?? '').toString().trim();
  if (!raw) return 'Consultar';
  if (/[a-zA-Z$]/.test(raw)) return raw;
  return (p?.currency || 'USD').toUpperCase() === 'USD' ? `USD ${raw}` : `$ ${raw}`;
}

export function precioOrden(p) {
  const raw = (p?.price ?? '').toString().replace(/\./g, '').replace(/,/g, '');
  const m = raw.match(/\d+(\.\d+)?/);
  const n = m ? Number(m[0]) : 0;
  return (p?.currency || '').toUpperCase() === 'USD' ? n * USD_REF : n;
}

// Texto corto para la tarjeta (dirección · m² · ambientes · expensas).
export function descripcionCorta(p) {
  const partes = [p.address];
  if (p.area_m2) partes.push(`${p.area_m2} m²`);
  if (p.rooms) partes.push(`${p.rooms} amb`);
  if (p.expenses) partes.push(`expensas ${p.expenses}`);
  return partes.filter(Boolean).join(' · ');
}

export function propiedadParaTarjeta(p) {
  return {
    id: p.id,
    img: (p.images && p.images[0]) || '',
    price: formatPrecio(p),
    title: p.title,
    desc: descripcionCorta(p),
    link: p.external_link || null,
  };
}

// Hook de listado: devuelve las propiedades publicadas de la base.
export function usePropiedades() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelado = false;
    const t = setTimeout(() => {
      api('/properties')
        .then(data => { if (!cancelado) setItems(Array.isArray(data) ? data : []); })
        .catch(e => { if (!cancelado) setError(e.message); })
        .finally(() => { if (!cancelado) setLoading(false); });
    }, 0);
    return () => { cancelado = true; clearTimeout(t); };
  }, []);

  return { items, loading, error };
}
