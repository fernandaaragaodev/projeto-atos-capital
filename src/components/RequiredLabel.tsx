import { Box } from '@mui/material';
import type { ReactNode } from 'react';

interface RequiredLabelProps {
  children: ReactNode;
  required?: boolean;
}

/**
 * Rótulo de campo com asterisco vermelho quando obrigatório.
 * O Design System exige que a obrigatoriedade fique visível no rótulo,
 * nunca dependa só da validação no envio.
 */
export function RequiredLabel({ children, required }: RequiredLabelProps) {
  return (
    <Box component="span">
      {children}
      {required && (
        <Box component="span" sx={{ color: 'error.main', ml: 0.5 }}>
          *
        </Box>
      )}
    </Box>
  );
}
