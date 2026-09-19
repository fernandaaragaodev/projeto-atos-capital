import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { clearToken, getToken, setToken } from '@/api/client';
import { me } from '@/api/auth';
import { papelFromApi } from '@/api/mappers';

import type { UsuarioLogado } from '@/api/types';
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
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string) => Promise<void>;
  logout: () => void;
  hasRole: (...papeis: Papel[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

function mapUsuarioLogado(dto: UsuarioLogado): AuthUser {
  return {
    id: String(dto.id),
    nome: dto.nome,
    email: dto.email,
    grupoEmpresaId: String(dto.grupoEmpresaId),
    grupoEmpresaNome: dto.grupoEmpresaNome,
    papel: papelFromApi(dto.papel),
  };
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const [token, setTokenState] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const tokenSalvo = getToken();

    if (!tokenSalvo) {
      setLoading(false);
      return;
    }

    setTokenState(tokenSalvo);

    me()
      .then((dto) => {
        setUser(mapUsuarioLogado(dto));
      })
      .catch(() => {
        clearToken();
        setTokenState(null);
        setUser(null);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const login = useCallback(
    async (novoToken: string) => {
      setToken(novoToken);
      setTokenState(novoToken);

      try {
        const dto = await me();

        setUser(mapUsuarioLogado(dto));
      } catch (error) {
        clearToken();
        setTokenState(null);
        setUser(null);

        throw error;
      }
    },
    [],
  );

  const logout = useCallback(() => {
    clearToken();
    setTokenState(null);
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: user !== null,
      loading,

      login,
      logout,

      hasRole: (...papeis: Papel[]) =>
        user !== null && papeis.includes(user.papel),
    }),
    [
      user,
      token,
      loading,
      login,
      logout,
    ],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error(
      'useAuth deve ser usado dentro de AuthProvider',
    );
  }

  return ctx;
}