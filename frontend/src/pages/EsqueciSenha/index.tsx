import { Alert, Box, Button, TextField, Typography, useMediaQuery } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { LineErrorForm } from '@/components/LineErrorForm';
import { RequiredLabel } from '@/components/RequiredLabel';
import { brand, logos } from '@/theme/tokens';
import type { ThemeMode } from '@/theme/tokens';
import { useApp } from './useApp';

/**
 * Tela "Esqueci a senha" — mesmo split screen do Login (painel de marca +
 * formulário), pra manter a identidade visual entre as duas telas públicas.
 * Depois do envio, o formulário dá lugar a uma mensagem de confirmação.
 */
export function EsqueciSenha() {
  const { register, submit, errors, erro, enviando, enviado, emailEnviado } = useApp();
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
              Vamos recuperar seu acesso.
            </Typography>
            <Typography sx={{ opacity: 0.85, fontSize: 15 }}>
              Informe seu e-mail cadastrado e enviamos um link seguro para você criar uma nova senha.
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

          {enviado ? (
            <Box>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  bgcolor: mode === 'light' ? 'rgba(191,21,44,0.08)' : 'rgba(232,90,114,0.18)',
                  color: 'primary.main',
                  mb: 2,
                }}
              >
                <MarkEmailReadOutlinedIcon />
              </Box>
              <Typography variant="h1" sx={{ fontSize: 22, mb: 1 }}>
                Verifique seu e-mail
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Se <strong>{emailEnviado}</strong> estiver cadastrado, você vai receber um link para
                redefinir sua senha em instantes.
              </Typography>
              <Button
                component={RouterLink}
                to="/login"
                variant="outlined"
                fullWidth
                startIcon={<ArrowBackIcon />}
                sx={{ py: 1.1 }}
              >
                Voltar para o login
              </Button>
            </Box>
          ) : (
            <>
              <Typography variant="h1" sx={{ fontSize: 22, mb: 0.5 }}>
                Esqueci a senha
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
                Informe o e-mail da sua conta para receber o link de redefinição.
              </Typography>

              <form onSubmit={submit}>
                <Box sx={{ mb: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    type="email"
                    autoComplete="username"
                    autoFocus
                    label={<RequiredLabel required>E-mail</RequiredLabel>}
                    {...register('email')}
                    error={Boolean(errors.email)}
                  />
                  <LineErrorForm message={errors.email?.message} />
                </Box>

                {erro && (
                  <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
                    {erro}
                  </Alert>
                )}

                <Button type="submit" variant="contained" fullWidth disabled={enviando} sx={{ mt: 2, py: 1.1 }}>
                  {enviando ? 'Enviando...' : 'Continuar'}
                </Button>

                <Button
                  component={RouterLink}
                  to="/login"
                  fullWidth
                  startIcon={<ArrowBackIcon fontSize="small" />}
                  sx={{ mt: 1, color: 'text.secondary' }}
                >
                  Voltar para o login
                </Button>
              </form>
            </>
          )}
        </Box>
      </Box>
    </Box>
  );
}
