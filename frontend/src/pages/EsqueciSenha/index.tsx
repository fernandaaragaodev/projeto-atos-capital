import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { useTheme } from '@mui/material/styles';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import { Link as RouterLink } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LineErrorForm } from '@/components/LineErrorForm';
import { RequiredLabel } from '@/components/RequiredLabel';
import { useApp } from './useApp';

/**
 * Tela "Esqueci a senha" — mesmo AuthLayout do Login, pra manter a identidade
 * visual entre as duas telas públicas. Depois do envio, o formulário dá lugar
 * a uma mensagem de confirmação.
 */
export function EsqueciSenha() {
  const { register, submit, errors, erro, enviando, enviado, emailEnviado } = useApp();
  const theme = useTheme();
  const isLight = theme.palette.mode === 'light';

  return (
    <AuthLayout
      headline="Vamos recuperar seu acesso."
      subtitle="Informe seu e-mail cadastrado e enviamos um link seguro para você criar uma nova senha."
    >
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
              bgcolor: isLight ? 'rgba(191,21,44,0.08)' : 'rgba(232,90,114,0.18)',
              color: 'primary.main',
              mb: 2,
            }}
          >
            <MarkEmailReadOutlinedIcon />
          </Box>
          <Typography variant="h1" sx={{ fontSize: { xs: 20, sm: 22 }, mb: 1 }}>
            Verifique seu e-mail
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3, overflowWrap: 'anywhere' }}>
            Se <strong>{emailEnviado}</strong> estiver cadastrado, você vai receber um link para redefinir sua senha em
            instantes.
          </Typography>
          <Button
            component={RouterLink}
            to="/login"
            variant="outlined"
            fullWidth
            startIcon={<ArrowBackIcon />}
            sx={{ py: 1.1, minHeight: 44 }}
          >
            Voltar para o login
          </Button>
        </Box>
      ) : (
        <>
          <Typography variant="h1" sx={{ fontSize: { xs: 20, sm: 22 }, mb: 0.5 }}>
            Esqueci a senha
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 3, sm: 4 } }}>
            Informe o e-mail da sua conta para receber o link de redefinição.
          </Typography>

          <form onSubmit={submit} noValidate>
            <Box sx={{ mb: 1 }}>
              <TextField
                fullWidth
                size="small"
                type="email"
                inputMode="email"
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

            <Button type="submit" variant="contained" fullWidth disabled={enviando} sx={{ mt: 2, py: 1.1, minHeight: 44 }}>
              {enviando ? 'Enviando...' : 'Continuar'}
            </Button>

            <Button
              component={RouterLink}
              to="/login"
              fullWidth
              startIcon={<ArrowBackIcon fontSize="small" />}
              sx={{ mt: 1, minHeight: 44, color: 'text.secondary' }}
            >
              Voltar para o login
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  );
}
