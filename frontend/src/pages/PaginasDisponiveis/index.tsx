import { Box, Button, Card, CardActionArea, Grid, InputAdornment, Paper, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme } from '@mui/material/styles';
import { useApp } from './useApp';
import { brand } from '@/theme/tokens';
import type { ThemeMode } from '@/theme/tokens';

/**
 * Tela "Páginas Disponíveis" — replica o hub de navegação do portal
 * (hero com degradê da marca + busca, atalhos recentes e seções por módulo).
 */
export function PaginasDisponiveis() {
  const theme = useTheme();
  const mode = theme.palette.mode as ThemeMode;
  const b = brand[mode];
  const { searchTerm, setSearchTerm, recentPages, sections, totalPages } = useApp();

  return (
    <Box>
      <Paper
        sx={{
          p: 4,
          mb: 4,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${b.primaryStrong}, ${b.primaryMuted})`,
          color: '#fff',
          border: 'none',
        }}
      >
        <Typography variant="overline" sx={{ opacity: 0.8, letterSpacing: 1, fontWeight: 700 }}>
          Portal Bank Services
        </Typography>
        <Typography variant="h1" sx={{ fontSize: 32, fontWeight: 700, mt: 1 }}>
          Páginas Disponíveis
        </Typography>
        <Typography sx={{ opacity: 0.85, mt: 0.5 }}>
          Explore todas as páginas disponíveis no portal · {totalPages} páginas
        </Typography>

        <TextField
          placeholder="Pesquisar página..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          size="small"
          sx={{
            mt: 3,
            maxWidth: 420,
            bgcolor: 'rgba(255,255,255,0.12)',
            borderRadius: 1,
            input: { color: '#fff' },
            '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon sx={{ color: 'rgba(255,255,255,0.8)' }} fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
      </Paper>

      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'primary.main' }}>
          Acessado recentemente
        </Typography>
        <Button size="small">Limpar histórico</Button>
      </Box>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {recentPages.map(({ id, label, icon: Icon }) => (
          <Grid item xs={6} sm={4} md={3} key={id}>
            <Card variant="outlined">
              <CardActionArea sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Icon color="primary" />
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {label}
                </Typography>
              </CardActionArea>
            </Card>
          </Grid>
        ))}
      </Grid>

      {sections.map((section) => (
        <Box key={section.id} sx={{ mb: 4 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'primary.main', mb: 0.5 }}
          >
            {section.title} ({section.count})
          </Typography>
          {section.subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              {section.subtitle}
            </Typography>
          )}
          <Grid container spacing={2}>
            {section.pages.map(({ id, label, icon: Icon }) => (
              <Grid item xs={6} sm={4} md={3} key={id}>
                <Card variant="outlined">
                  <CardActionArea sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Icon color="primary" />
                    <Typography variant="body2" sx={{ fontWeight: 500 }}>
                      {label}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
