const API = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export async function api(path, { method='GET', body, auth=true }={}) {
  const headers = { 'Content-Type': 'application/json' };
  const opts = { method, headers, credentials: 'include' };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${API}/api${path}`, opts);
  const data = await res.json().catch(()=> ({}));
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}
