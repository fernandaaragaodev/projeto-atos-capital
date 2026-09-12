import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material';
import { LineErrorForm } from '@/components/LineErrorForm';
import { RequiredLabel } from '@/components/RequiredLabel';
import { logos } from '@/theme/tokens';
import { useApp } from './useApp';

/** Tela de login — sem menu lateral e sem abas, fora do MainLayout. */
export function Login() {
  const { register, submit, errors, erro, enviando } = useApp();

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <Paper variant="outlined" sx={{ p: 4, borderRadius: 2, width: 360 }}>
        <Box
          component="img"
          src={logos.logo}
          alt="Atos Capital"
          sx={{ height: 28, mb: 3, display: 'block', mx: 'auto' }}
        />
        <Typography variant="h1" sx={{ textAlign: 'center', mb: 3, fontSize: 20 }}>
          Entrar
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

          {erro && (
            <Alert severity="error" sx={{ mt: 1, mb: 2 }}>
              {erro}
            </Alert>
          )}

          <Button type="submit" variant="contained" fullWidth disabled={enviando} sx={{ mt: 2 }}>
            {enviando ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </Paper>
    </Box>
  );
}
