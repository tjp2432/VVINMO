// Base del backend, un solo lugar para toda la app.
//
// - Dev (`npm run dev`): VITE_API_URL no definida => API = '' => fetch relativo a
//   http://localhost:5173/api/... que Vite proxea a http://localhost:4000
//   (ver vite.config.js). Asi no dependemos de CORS y usamos el proxy del README.
// - Prod: definir VITE_API_URL=https://api.tudominio.com  (sin barra final).
export const API = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '');

export async function api(path, { method='GET', body, auth=true }={}) {
  const headers = { 'Content-Type': 'application/json' };
  const opts = { method, headers, credentials: auth ? 'include' : 'same-origin' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}/api${path}`, opts);
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

// Sube archivos (FormData) sin fijar Content-Type: el browser agrega el boundary.
export async function apiUpload(path, formData) {
  const res = await fetch(`${API}/api${path}`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
  });
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
