import { createContext, useContext } from 'react';

// Navegação: { route, go(nome), back() }
export const RouterCtx = createContext(null);
export const useRouter = () => useContext(RouterCtx);

// Sessão: { user, setUser(u), logout() }
export const SessionCtx = createContext(null);
export const useSession = () => useContext(SessionCtx);

// Interface: { toast(msg), openSheet(elemento, { left }), closeSheet() }
export const UICtx = createContext(null);
export const useUI = () => useContext(UICtx);
