import { Alert, Box, Button, TextField, Typography } from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { AuthLayout } from '@/layouts/AuthLayout';
import { LineErrorForm } from '@/components/LineErrorForm';
import { RequiredLabel } from '@/components/RequiredLabel';
import { useApp } from './useApp';

/**
 * Tela de login — fora do MainLayout (sem menu lateral, sem abas).
 * O AuthLayout cuida do split screen no desktop e da faixa de marca no mobile.
 */
export function Login() {
  const { register, submit, errors, erro, enviando } = useApp();

  return (
    <AuthLayout
      headline="Sua central financeira, em um só portal."
      subtitle="Acompanhe notas, boletos, chamados e permissões da Atos Capital com um único acesso."
    >
      <Typography variant="h1" sx={{ fontSize: { xs: 20, sm: 22 }, mb: 0.5 }}>
        Entrar
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: { xs: 3, sm: 4 } }}>
        Informe suas credenciais para acessar o portal.
      </Typography>

      <form onSubmit={submit} noValidate>
        <Box sx={{ mb: 2 }}>
          <TextField
            fullWidth
            size="small"
            type="email"
            inputMode="email"
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
            sx={{
              display: 'inline-block',
              py: 0.5, // área de toque maior no celular
              color: 'primary.main',
              textDecoration: 'none',
              fontWeight: 500,
              '&:hover': { textDecoration: 'underline' },
            }}
          >
            Esqueci minha senha
          </Typography>
        </Box>

        {erro && (
          <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
            {erro}
          </Alert>
        )}

        <Button type="submit" variant="contained" fullWidth disabled={enviando} sx={{ mt: 2, py: 1.1, minHeight: 44 }}>
          {enviando ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>
    </AuthLayout>
  );
}
