import { createContext, useContext, useMemo, type ReactNode } from 'react';
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
  user: AuthUser;
  hasRole: (...papeis: Papel[]) => boolean;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * RF10 — Sincronização de usuários via SSO/JWT.
 *
 * Em produção, o portal Atos Capital emite um JWT assinado (usuário + grupo empresa)
 * ao acessar esta ferramenta; a API de suporte valida a assinatura e faz o upsert do
 * usuário/grupo de forma transparente (Seção 6.2 do Termo de Referência).
 *
 * Este provider decodifica esse token (hoje simulado) uma única vez e expõe o usuário
 * autenticado para toda a árvore de componentes. Ponto de integração real:
 * substituir `mockDecodedToken` pela leitura/validação do JWT recebido do portal
 * (ex.: querystring `?token=` ou cookie compartilhado) antes de renderizar <App />.
 */
const mockDecodedToken: AuthUser = {
  id: 'usr-001',
  nome: 'Victor Breno Santos Rodrigues',
  email: 'victor.rodrigues@atoscapital.com.br',
  grupoEmpresaId: 'grp-001',
  grupoEmpresaNome: 'Atos Capital — Matriz',
  papel: 'supervisor',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useMemo<AuthContextValue>(
    () => ({
      user: mockDecodedToken,
      hasRole: (...papeis: Papel[]) => papeis.includes(mockDecodedToken.papel),
    }),
    [],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}
