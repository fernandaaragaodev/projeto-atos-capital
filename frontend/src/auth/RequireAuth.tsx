import type { ReactNode } from 'react';

/**
 * Autenticação temporariamente desabilitada.
 *
 * TODO: reativar a proteção das rotas quando
 * o fluxo de autenticação por token estiver definido.
 */
export function RequireAuth({ children }: { children: ReactNode }) {
  return <>{children}</>;
}