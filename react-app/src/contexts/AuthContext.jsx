// Contexto + hook en su propio modulo: dejar AuthProvider (componente) fuera
// permite que cada archivo exporte solo lo que le corresponde y asi conserve
// el hot-reload de Vite (react/only-export-components).
import { createContext, useContext } from 'react';

export const AuthCtx = createContext(null);

export const useAuth = () => useContext(AuthCtx);
