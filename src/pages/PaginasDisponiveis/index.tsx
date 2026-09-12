import { Box, Button, Card, CardActionArea, Grid, InputAdornment, Paper, Stack, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import { useTheme, alpha } from '@mui/material/styles';
import { useApp } from './useApp';
import { brand } from '@/theme/tokens';
import type { ThemeMode } from '@/theme/tokens';
import type { PageLink } from './useApp';

/**
 * Tela "Páginas Disponíveis" — replica o hub de navegação do portal
 * (hero com degradê da marca + busca, atalhos recentes e seções por módulo).
 */
export function PaginasDisponiveis() {
  const theme = useTheme();
  const mode = theme.palette.mode as ThemeMode;
  const b = brand[mode];
  const { searchTerm, setSearchTerm, recentPages, sections, totalPages } = useApp();

  const renderPageCard = ({ id, label, icon: Icon }: PageLink) => (
    <Grid item xs={6} sm={4} md={3} key={id}>
      <Card
        variant="outlined"
        sx={{
          borderRadius: 2,
          transition: 'transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease',
          '&:hover': {
            transform: 'translateY(-2px)',
            borderColor: b.primary,
            boxShadow:
              mode === 'light' ? '0 10px 24px rgba(191,21,44,0.12)' : '0 10px 24px rgba(0,0,0,0.45)',
          },
        }}
      >
        <CardActionArea sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5, justifyContent: 'flex-start' }}>
          <Box
            sx={{
              width: 36,
              height: 36,
              flexShrink: 0,
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              bgcolor: alpha(b.primary, mode === 'light' ? 0.08 : 0.18),
              color: b.primary,
            }}
          >
            <Icon fontSize="small" />
          </Box>
          <Typography variant="body2" sx={{ fontWeight: 500, lineHeight: 1.3 }}>
            {label}
          </Typography>
        </CardActionArea>
      </Card>
    </Grid>
  );

  return (
    <Box>
      <Paper
        sx={{
          position: 'relative',
          overflow: 'hidden',
          p: { xs: 3, md: 4 },
          mb: 4,
          borderRadius: 3,
          background: `linear-gradient(135deg, ${b.primaryStrong}, ${b.primaryMuted})`,
          color: '#fff',
          border: 'none',
          boxShadow: '0 14px 32px rgba(0,0,0,0.18)',
        }}
      >
        {/* Decoração sutil — dois círculos translúcidos, sem competir com o conteúdo */}
        <Box
          sx={{
            position: 'absolute',
            top: -90,
            right: -50,
            width: 260,
            height: 260,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.06)',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            bottom: -110,
            right: 90,
            width: 190,
            height: 190,
            borderRadius: '50%',
            bgcolor: 'rgba(255,255,255,0.04)',
          }}
        />

        <Box sx={{ position: 'relative' }}>
          <Typography variant="overline" sx={{ opacity: 0.85, letterSpacing: 1, fontWeight: 700 }}>
            Portal Bank Services
          </Typography>
          <Typography variant="h1" sx={{ fontSize: { xs: 26, md: 32 }, fontWeight: 700, mt: 1 }}>
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
              bgcolor: 'rgba(255,255,255,0.14)',
              borderRadius: 1.5,
              input: { color: '#fff' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.3)' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,0.5)' },
              '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' },
            }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'rgba(255,255,255,0.85)' }} fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
        </Box>
      </Paper>

      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Typography
          variant="body2"
          sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'primary.main', letterSpacing: 0.5 }}
        >
          Acessado recentemente
        </Typography>
        <Button size="small" sx={{ color: 'text.secondary' }}>
          Limpar histórico
        </Button>
      </Stack>

      <Grid container spacing={2} sx={{ mb: 4 }}>
        {recentPages.map(renderPageCard)}
      </Grid>

      {sections.map((section) => (
        <Box key={section.id} sx={{ mb: 4 }}>
          <Typography
            variant="body2"
            sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'primary.main', mb: 0.5, letterSpacing: 0.5 }}
          >
            {section.title} ({section.count})
          </Typography>
          {section.subtitle && (
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5 }}>
              {section.subtitle}
            </Typography>
          )}
          <Grid container spacing={2}>
            {section.pages.map(renderPageCard)}
          </Grid>
        </Box>
      ))}
    </Box>
  );
}
