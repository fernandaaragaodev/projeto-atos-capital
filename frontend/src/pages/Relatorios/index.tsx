import { Box, Button, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import { ResumeBar } from '@/components/ResumeBar';
import { RoleGuard } from '@/auth/RoleGuard';
import { useApp } from './useApp';

/** RF08 — Relatórios e painel de chamados mais recorrentes. Acesso restrito (RF12). */
function RelatoriosContent() {
  const { filtros, setFiltros, produtos, gruposEmpresa, categorias, porCategoria, resumoSla, handleExport } = useApp();

  const maiorQuantidade = Math.max(1, ...porCategoria.map((item) => item.quantidade));

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="h1">Relatórios de SLA</Typography>
        <Button variant="outlined" startIcon={<FileDownloadIcon />} onClick={handleExport}>
          Exportar
        </Button>
      </Stack>

      <ResumeBar
        items={[
          { label: 'Chamados no filtro', value: resumoSla.total },
          { label: '% dentro do SLA', value: `${resumoSla.percentualDentroSla}%`, color: 'success' },
          { label: 'SLA estourado', value: resumoSla.estourados, color: 'error' },
        ]}
      />

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            size="small"
            label="Produto"
            value={filtros.produto}
            onChange={(e) => setFiltros((prev) => ({ ...prev, produto: e.target.value }))}
          >
            <MenuItem value="todos">Todos os produtos</MenuItem>
            {produtos.map((p) => (
              <MenuItem key={p} value={p}>
                {p}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            size="small"
            label="Cliente / grupo empresa"
            value={filtros.grupoEmpresa}
            onChange={(e) => setFiltros((prev) => ({ ...prev, grupoEmpresa: e.target.value }))}
          >
            <MenuItem value="todos">Todos os clientes</MenuItem>
            {gruposEmpresa.map((g) => (
              <MenuItem key={g} value={g}>
                {g}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
        <Grid item xs={12} sm={4}>
          <TextField
            select
            fullWidth
            size="small"
            label="Categoria"
            value={filtros.categoria}
            onChange={(e) => setFiltros((prev) => ({ ...prev, categoria: e.target.value }))}
          >
            <MenuItem value="todos">Todas as categorias</MenuItem>
            {categorias.map((c) => (
              <MenuItem key={c} value={c}>
                {c}
              </MenuItem>
            ))}
          </TextField>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'primary.main', mb: 2 }}>
          Chamados mais recorrentes por categoria
        </Typography>
        {porCategoria.length === 0 && (
          <Typography variant="body2" color="text.secondary">
            Nenhum chamado no filtro selecionado.
          </Typography>
        )}
        <Stack spacing={1.5}>
          {porCategoria.map((item) => (
            <Box key={item.categoria}>
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="body2">{item.categoria}</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {item.quantidade}
                </Typography>
              </Stack>
              <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}>
                <Box
                  sx={{
                    height: '100%',
                    width: `${(item.quantidade / maiorQuantidade) * 100}%`,
                    bgcolor: 'primary.main',
                    borderRadius: 4,
                  }}
                />
              </Box>
            </Box>
          ))}
        </Stack>
      </Paper>
    </Box>
  );
}

export function Relatorios() {
  return (
    <RoleGuard allow={['supervisor', 'admin']}>
      <RelatoriosContent />
    </RoleGuard>
  );
}
