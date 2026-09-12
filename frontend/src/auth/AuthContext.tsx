import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { login as apiLogin, me as apiMe } from '@/api/auth';
import { getToken, setToken, clearToken } from '@/api/client';
import type { Papel } from '@/types/chamado';

export interface AuthUser {
  id: string;
  nome: string;
  email: string;
  grupoEmpresaId: string;
  grupoEmpresaNome: string;
  papel: Papel;
}

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, senha: string) => Promise<void>;
  logout: () => void;
  hasRole: (...papeis: Papel[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * RF10 — Autenticação real via portal Atos Capital.
 * No boot do app: se existe token guardado, busca o usuário em GET /auth/me.
 * Se o token for inválido/expirado, a API responde 401, o client.ts dispara
 * o evento "auth:unauthorized" e este provider desloga automaticamente.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }
    apiMe()
      .then(setUser)
      .catch(() => {
        clearToken();
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    const handleUnauthorized = () => setUser(null);
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, senha: string) => {
    const { token, usuario } = await apiLogin(email, senha);
    setToken(token);
    setUser(usuario);
  };

  const logout = () => {
    clearToken();
    setUser(null);
  };

  const hasRole = (...papeis: Papel[]) => Boolean(user && papeis.includes(user.papel));

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: Boolean(user), loading, login, logout, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
