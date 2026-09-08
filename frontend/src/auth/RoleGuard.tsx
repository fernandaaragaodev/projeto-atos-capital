import type { ReactNode } from 'react';
import { Alert, Box } from '@mui/material';
import type { Papel } from '@/types/chamado';
import { useAuth } from './AuthContext';

interface RoleGuardProps {
  allow: Papel[];
  children: ReactNode;
}

/** RF12 — Controle de acesso por papel. Bloqueia a tela para papéis não autorizados. */
export function RoleGuard({ allow, children }: RoleGuardProps) {
  const { hasRole } = useAuth();

  if (!hasRole(...allow)) {
    return (
      <Box>
        <Alert severity="warning">
          Você não tem permissão para acessar esta tela. Fale com um supervisor caso precise de acesso.
        </Alert>
      </Box>
    );
  }

  return <>{children}</>;
}
