import { createContext, useContext, useEffect, useState } from 'react';
import { api, getToken, setToken } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(getToken()));

  useEffect(() => {
    if (!getToken()) return;
    api.me().then((d) => setUser(d.user)).catch(() => setToken(null)).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener('revive:logout', onLogout);
    return () => window.removeEventListener('revive:logout', onLogout);
  }, []);

  const signIn = (data) => { setToken(data.token); setUser(data.user); };
  const signOut = () => { setToken(null); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

export const homeFor = (role) => ({ owner: '/requests', shop: '/shop/profile', admin: '/admin/shops' }[role] || '/');
