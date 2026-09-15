import type { ReactNode } from 'react';
import { Box, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { brand, logos } from '@/theme/tokens';
import type { ThemeMode } from '@/theme/tokens';

interface AuthLayoutProps {
  /** Frase de impacto do painel de marca. */
  headline: string;
  /** Texto de apoio do painel de marca (some em telas muito baixas, ex.: celular deitado). */
  subtitle: string;
  children: ReactNode;
}

/** Altura "cheia" que respeita a barra de endereço dos navegadores mobile (dvh), com fallback em vh. */
const fullHeight = {
  minHeight: '100vh',
  '@supports (height: 100dvh)': { minHeight: '100dvh' },
} as const;

/**
 * Casca das telas públicas (Login, Esqueci a senha).
 *
 * - md+ (≥ 900px): split screen — painel de marca à esquerda, formulário centralizado à direita.
 * - xs/sm (< 900px): empilhado — faixa de marca compacta no topo, formulário logo abaixo.
 *   Em celular deitado (altura baixa) a faixa encolhe e esconde o subtítulo para sobrar espaço ao formulário.
 *
 * Usa breakpoints CSS (sx) em vez de useMediaQuery para não piscar layout no primeiro render.
 */
export function AuthLayout({ headline, subtitle, children }: AuthLayoutProps) {
  const theme = useTheme();
  const mode = theme.palette.mode as ThemeMode;
  const b = brand[mode];
  const ano = new Date().getFullYear();

  return (
    <Box
      sx={{
        ...fullHeight,
        display: 'flex',
        flexDirection: { xs: 'column', md: 'row' },
        bgcolor: 'background.default',
      }}
    >
      {/* Painel / faixa de marca */}
      <Box
        component="aside"
        sx={{
          position: 'relative',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: { xs: 'flex-start', md: 'space-between' },
          gap: { xs: 2, sm: 3 },
          color: '#fff',
          background: `linear-gradient(160deg, ${b.primaryStrong}, ${b.primaryMuted})`,
          flex: { xs: '0 0 auto', md: '0 0 44%' },
          maxWidth: { md: 640 },
          px: { xs: 3, sm: 5, md: 5, lg: 6 },
          pt: {
            xs: 'calc(20px + env(safe-area-inset-top, 0px))',
            sm: 'calc(28px + env(safe-area-inset-top, 0px))',
            md: 'calc(48px + env(safe-area-inset-top, 0px))',
          },
          pb: { xs: 3, sm: 4, md: 6 },
          '@media (max-height: 520px) and (max-width: 899.95px)': {
            gap: 1,
            pt: 'calc(12px + env(safe-area-inset-top, 0px))',
            pb: 2,
          },
        }}
      >
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            top: { xs: -90, md: -100 },
            left: { xs: -70, md: -80 },
            width: { xs: 200, md: 320 },
            height: { xs: 200, md: 320 },
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.05)',
          }}
        />
        <Box
          aria-hidden
          sx={{
            position: 'absolute',
            bottom: { xs: -120, md: -140 },
            right: { xs: -80, md: -60 },
            width: { xs: 220, md: 380 },
            height: { xs: 220, md: 380 },
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.04)',
          }}
        />

        <Box
          component="img"
          src={logos.logo}
          alt="Atos Capital"
          sx={{ height: { xs: 22, md: 26 }, alignSelf: 'flex-start', filter: 'brightness(0) invert(1)', position: 'relative' }}
        />

        <Box sx={{ position: 'relative', maxWidth: { xs: 480, md: 380 } }}>
          <Typography
            variant="h1"
            sx={{
              fontSize: { xs: 20, sm: 24, md: 'clamp(26px, 2.4vw, 32px)' },
              fontWeight: 700,
              lineHeight: 1.25,
              mb: { xs: 0.75, md: 2 },
            }}
          >
            {headline}
          </Typography>
          <Typography
            sx={{
              opacity: 0.85,
              fontSize: { xs: 13, sm: 14, md: 15 },
              '@media (max-height: 520px) and (max-width: 899.95px)': { display: 'none' },
            }}
          >
            {subtitle}
          </Typography>
        </Box>

        <Typography
          variant="caption"
          sx={{ opacity: 0.6, position: 'relative', display: { xs: 'none', md: 'block' } }}
        >
          © {ano} Atos Capital
        </Typography>
      </Box>

      {/* Área do formulário */}
      <Box
        component="main"
        sx={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: { xs: 'flex-start', sm: 'center' },
          px: { xs: 3, sm: 6 },
          pt: { xs: 4, sm: 6, md: 6 },
          pb: {
            xs: 'calc(24px + env(safe-area-inset-bottom, 0px))',
            md: 'calc(48px + env(safe-area-inset-bottom, 0px))',
          },
        }}
      >
        <Box sx={{ width: '100%', maxWidth: { xs: 420, md: 360 }, flex: { xs: 1, sm: '0 0 auto' } }}>{children}</Box>

        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ mt: 4, display: { xs: 'block', md: 'none' }, opacity: 0.8 }}
        >
          © {ano} Atos Capital
        </Typography>
      </Box>
    </Box>
  );
}
