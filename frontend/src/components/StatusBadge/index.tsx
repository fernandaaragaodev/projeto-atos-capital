import { Chip } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { states } from '@/theme/tokens';
import type { ThemeMode } from '@/theme/tokens';

export type StatusVariant = keyof typeof states;

interface StatusBadgeProps {
  label: string;
  status: StatusVariant;
}

/**
 * Badge de status das tabelas.
 * Usa o par state.* (texto) + statusBg.* (fundo translúcido) do token do status,
 * de acordo com o tema ativo (light/dark).
 */
export function StatusBadge({ label, status }: StatusBadgeProps) {
  const theme = useTheme();
  const mode = theme.palette.mode as ThemeMode;
  const token = states[status][mode];

  return (
    <Chip
      label={label}
      size="small"
      sx={{
        color: token.state,
        backgroundColor: token.statusBg,
        fontWeight: 600,
        fontSize: 12,
      }}
    />
  );
}
