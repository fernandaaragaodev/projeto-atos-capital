import type { ReactNode } from 'react';

interface RequireAuthProps {
  children: ReactNode;
}

/**
 * TEMPORÁRIO: sem tela de login por enquanto, então libera acesso direto.
 * Quando a autenticação via SSO (token vindo do portal Atos Capital) for
 * implementada, este componente volta a checar isAuthenticated/loading
 * e redirecionar quem não tiver token válido.
 */
export function RequireAuth({ children }: RequireAuthProps) {
  return <>{children}</>;
}