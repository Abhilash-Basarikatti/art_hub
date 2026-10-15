import { createContext, useContext, useEffect, useState } from 'react';
import api from './api';
const Ctx = createContext();
export const useApp = () => useContext(Ctx);
export function AppProvider({ children }) {
  const [user, setUser] = useState(null), [ready, setReady] = useState(false);
  const [cart, setCart] = useState(() => { try { return JSON.parse(localStorage.getItem('cart') || '[]'); } catch { return []; } });
  useEffect(() => { localStorage.getItem('token') ? api.get('/auth/me').then(r => setUser(r.data)).catch(() => localStorage.removeItem('token')).finally(() => setReady(true)) : setReady(true); }, []);
  useEffect(() => localStorage.setItem('cart', JSON.stringify(cart)), [cart]);
  const login = ({ token, user }) => { localStorage.setItem('token', token); setUser(user); };
  const logout = () => { localStorage.removeItem('token'); setUser(null); };
  const addToCart = a => setCart(c => c.some(x => x._id === a._id) ? c : [...c, { _id: a._id, title: a.title, price: a.price, image: a.image }]);
  const removeFromCart = id => setCart(c => c.filter(x => x._id !== id));
  return <Ctx.Provider value={{ user, setUser, ready, login, logout, cart, addToCart, removeFromCart, clearCart: () => setCart([]) }}>{children}</Ctx.Provider>;
}
