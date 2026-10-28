import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api.js';

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(()=>{
    try{ const c = sessionStorage.getItem('vvinmook_user'); return c?JSON.parse(c):null; }catch{ return null; }
  });
  const [loading, setLoading] = useState(false); // no bloquea render inicial

  async function refresh() {
    const ctrl = new AbortController();
    const t = setTimeout(async ()=>{
      try {
        const data = await api('/auth/me');
        setUser(data);
        try{ sessionStorage.setItem('vvinmook_user', JSON.stringify(data)); }catch{}
      } catch {
        setUser(null);
        try{ sessionStorage.removeItem('vvinmook_user'); }catch{}
      } finally { setLoading(false); }
    }, 120); // defer para no bloquear paint
    return ()=> { clearTimeout(t); ctrl.abort(); };
  }

  useEffect(()=> { refresh(); }, []);

  async function login(email, password) {
    const data = await api('/auth/login', { method:'POST', body:{ email, password } });
    return data; // {need_2fa, _dev_code}
  }
  async function register(payload) {
    const data = await api('/auth/register', { method:'POST', body: payload });
    return data;
  }
  async function verify2FA(email, code, purpose='login') {
    const data = await api('/auth/verify-2fa', { method:'POST', body:{ email, code, purpose } });
    const u = data.user || { email, role: data.role };
    setUser(u);
    try{ sessionStorage.setItem('vvinmook_user', JSON.stringify(u)); }catch{}
    return data;
  }
  async function logout() {
    await api('/auth/logout', { method:'POST' });
    setUser(null);
    try{ sessionStorage.removeItem('vvinmook_user'); }catch{}
  }

  return <AuthCtx.Provider value={{ user, loading, login, register, verify2FA, logout, refresh }}>{children}</AuthCtx.Provider>
}
