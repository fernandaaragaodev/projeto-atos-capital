import { Box, ButtonBase, Paper, Stack, Typography } from '@mui/material';
import { alpha } from '@mui/material/styles';
import type { SvgIconComponent } from '@mui/icons-material';

export interface ResumeItem {
  label: string;
  value: string | number;
  color?: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon?: SvgIconComponent;
  /** Torna o card clicável (ex.: aplicar o filtro correspondente na tabela). */
  onClick?: () => void;
  /** Destaca o card cujo filtro está aplicado. */
  active?: boolean;
}

interface ResumeBarProps {
  items: ResumeItem[];
}

/** <ResumeBar /> — Cards de totalizadores (contagens, somas), opcionalmente com ícone e clique. */
export function ResumeBar({ items }: ResumeBarProps) {
  return (
    <Stack direction="row" spacing={2} useFlexGap sx={{ mb: 2, flexWrap: 'wrap' }}>
      {items.map((item) => {
        const Icon = item.icon;
        const paletteColor = item.color ?? 'primary';
        const clickable = Boolean(item.onClick);

        const content = (
          <Stack direction="row" spacing={1.5} alignItems="center" sx={{ px: 2.5, py: 1.5, width: '100%' }}>
            {Icon && (
              <Box
                sx={(theme) => ({
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  flexShrink: 0,
                  color: `${paletteColor}.main`,
                  bgcolor: alpha(theme.palette[paletteColor].main, 0.12),
                })}
              >
                <Icon fontSize="small" />
              </Box>
            )}
            <Box sx={{ textAlign: 'left' }}>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: 'uppercase', fontWeight: 700, display: 'block' }}
              >
                {item.label}
              </Typography>
              <Typography
                variant="h5"
                sx={{ fontWeight: 700 }}
                color={item.color ? `${item.color}.main` : 'text.primary'}
              >
                {item.value}
              </Typography>
            </Box>
          </Stack>
        );

        return (
          <Paper
            key={item.label}
            variant="outlined"
            sx={(theme) => ({
              minWidth: 160,
              borderRadius: 2,
              overflow: 'hidden',
              transition: 'border-color 0.15s, box-shadow 0.15s',
              ...(item.active && {
                borderColor: `${paletteColor}.main`,
                boxShadow: `0 0 0 1px ${theme.palette[paletteColor].main}`,
              }),
              ...(clickable && {
                '&:hover': { borderColor: `${paletteColor}.main` },
              }),
            })}
          >
            {clickable ? (
              <ButtonBase
                onClick={item.onClick}
                aria-pressed={Boolean(item.active)}
                sx={{ width: '100%', justifyContent: 'flex-start', font: 'inherit' }}
              >
                {content}
              </ButtonBase>
            ) : (
              content
            )}
          </Paper>
        );
      })}
    </Stack>
  );
}
