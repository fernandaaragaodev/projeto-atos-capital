import { Alert, Box, Button, TextField, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import { Link as RouterLink } from 'react-router-dom';
import { LineErrorForm } from '@/components/LineErrorForm';
import { RequiredLabel } from '@/components/RequiredLabel';
import { brand, logos } from '@/theme/tokens';
import type { ThemeMode } from '@/theme/tokens';
import { useApp } from './useApp';

/**
 * Tela de login — split screen: formulário de um lado, painel de marca do
 * outro. Fora do MainLayout (sem menu lateral, sem abas). O painel de marca
 * some em telas pequenas, sobrando só o formulário.
 */
export function Login() {
  const { register, submit, errors, erro, enviando } = useApp();
  const theme = useTheme();
  const mode = theme.palette.mode as ThemeMode;
  const b = brand[mode];
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', bgcolor: 'background.default' }}>
      {isMdUp && (
        <Box
          sx={{
            flexBasis: '46%',
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 6,
            color: '#fff',
            background: `linear-gradient(160deg, ${b.primaryStrong}, ${b.primaryMuted})`,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              top: -100,
              left: -80,
              width: 320,
              height: 320,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.05)',
            }}
          />
          <Box
            sx={{
              position: 'absolute',
              bottom: -140,
              right: -60,
              width: 380,
              height: 380,
              borderRadius: '50%',
              bgcolor: 'rgba(255,255,255,0.04)',
            }}
          />

          <Box
            component="img"
            src={logos.logo}
            alt="Atos Capital"
            sx={{ height: 26, filter: 'brightness(0) invert(1)', position: 'relative' }}
          />

          <Box sx={{ position: 'relative', maxWidth: 380 }}>
            <Typography variant="h1" sx={{ fontSize: 30, fontWeight: 700, lineHeight: 1.25, mb: 2 }}>
              Sua central financeira, em um só portal.
            </Typography>
            <Typography sx={{ opacity: 0.85, fontSize: 15 }}>
              Acompanhe notas, boletos, chamados e permissões da Atos Capital com um único acesso.
            </Typography>
          </Box>

          <Typography variant="caption" sx={{ opacity: 0.6, position: 'relative' }}>
            © {new Date().getFullYear()} Atos Capital
          </Typography>
        </Box>
      )}

      <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3 }}>
        <Box sx={{ width: '100%', maxWidth: 360 }}>
          {!isMdUp && (
            <Box
              component="img"
              src={logos.logo}
              alt="Atos Capital"
              sx={{ height: 26, mb: 4, display: 'block', mx: 'auto' }}
            />
          )}

          <Typography variant="h1" sx={{ fontSize: 22, mb: 0.5 }}>
            Entrar
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
            Informe suas credenciais para acessar o portal.
          </Typography>

          <form onSubmit={submit}>
            <Box sx={{ mb: 2 }}>
              <TextField
                fullWidth
                size="small"
                type="email"
                autoComplete="username"
                label={<RequiredLabel required>E-mail</RequiredLabel>}
                {...register('email')}
                error={Boolean(errors.email)}
              />
              <LineErrorForm message={errors.email?.message} />
            </Box>

            <Box sx={{ mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                type="password"
                autoComplete="current-password"
                label={<RequiredLabel required>Senha</RequiredLabel>}
                {...register('senha')}
                error={Boolean(errors.senha)}
              />
              <LineErrorForm message={errors.senha?.message} />
            </Box>

            <Box sx={{ textAlign: 'right', mb: 1 }}>
              <Typography
                component={RouterLink}
                to="/esqueci-senha"
                variant="caption"
                sx={{ color: 'primary.main', textDecoration: 'none', fontWeight: 500, '&:hover': { textDecoration: 'underline' } }}
              >
                Esqueci minha senha
              </Typography>
            </Box>

            {erro && (
              <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
                {erro}
              </Alert>
            )}

            <Button type="submit" variant="contained" fullWidth disabled={enviando} sx={{ mt: 2, py: 1.1 }}>
              {enviando ? 'Entrando...' : 'Entrar'}
            </Button>
          </form>
        </Box>
      </Box>
    </Box>
  );
}
