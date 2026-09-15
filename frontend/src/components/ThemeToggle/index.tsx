import { Box, IconButton, Tooltip } from '@mui/material';
import LightModeRoundedIcon from '@mui/icons-material/LightModeRounded';
import DarkModeRoundedIcon from '@mui/icons-material/DarkModeRounded';
import { alpha } from '@mui/material/styles';
import { useThemeMode } from '@/theme/ThemeModeProvider';
import { brand } from '@/theme/tokens';

/**
 * Botão de alternância de tema.
 *
 * Convenção corrigida: o ícone exibido representa o modo ATUAL (sol quando
 * claro, lua quando escuro) — não o modo para o qual o clique vai levar,
 * como estava antes. A troca entre os dois ícones é animada (giro + fade)
 * em vez de uma troca seca.
 */
export function ThemeToggle() {
  const { mode, toggleMode } = useThemeMode();
  const isDark = mode === 'dark';
  const b = brand[mode];

  return (
    <Tooltip title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}>
      <IconButton
        size="small"
        onClick={toggleMode}
        aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
        sx={{
          position: 'relative',
          width: 34,
          height: 34,
          overflow: 'hidden',
          '&:hover': { bgcolor: alpha(b.primary, isDark ? 0.16 : 0.08) },
        }}
      >
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: b.primary,
            transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
            transform: isDark ? 'rotate(-90deg) scale(0.4)' : 'rotate(0deg) scale(1)',
            opacity: isDark ? 0 : 1,
          }}
        >
          <LightModeRoundedIcon fontSize="small" />
        </Box>
        <Box
          sx={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: b.primary,
            transition: 'transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.2s ease',
            transform: isDark ? 'rotate(0deg) scale(1)' : 'rotate(90deg) scale(0.4)',
            opacity: isDark ? 1 : 0,
          }}
        >
          <DarkModeRoundedIcon fontSize="small" />
        </Box>
      </IconButton>
    </Tooltip>
  );
}
