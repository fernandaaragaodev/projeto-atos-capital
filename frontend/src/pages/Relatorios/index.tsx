import {
  Box,
  Button,
  Chip,
  Grid,
  LinearProgress,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';

import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FilterAltOffOutlinedIcon from '@mui/icons-material/FilterAltOffOutlined';
import TuneRoundedIcon from '@mui/icons-material/TuneRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import ConfirmationNumberOutlinedIcon from '@mui/icons-material/ConfirmationNumberOutlined';
import SpeedRoundedIcon from '@mui/icons-material/SpeedRounded';

import { useApp } from './useApp';

type PeriodoRapido = 7 | 30 | 90;

function formatarDataInput(data: Date) {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');

  return `${ano}-${mes}-${dia}`;
}

function formatarDataExibicao(data: string) {
  if (!data) {
    return '';
  }

  return data.split('-').reverse().join('/');
}

function RelatoriosContent() {
  const {
    filtros,
    setFiltros,
    produtos,
    gruposEmpresa,
    categorias,
    porCategoria,
    resumoSla,
    periodoInvalido,
    limparFiltros,
    handleExport,
  } = useApp();

  const filtrosAtivos = [
    filtros.produto !== 'todos',
    filtros.grupoEmpresa !== 'todos',
    filtros.categoria !== 'todos',
    Boolean(filtros.dataInicial),
    Boolean(filtros.dataFinal),
  ].filter(Boolean).length;

  const maiorQuantidade = Math.max(
    1,
    ...porCategoria.map((item) => item.quantidade),
  );

  const dentroDoSla = Math.max(
    0,
    resumoSla.total - resumoSla.estourados,
  );

  const aplicarPeriodoRapido = (dias: PeriodoRapido) => {
    const hoje = new Date();

    const dataInicial = new Date();
    dataInicial.setDate(hoje.getDate() - (dias - 1));

    setFiltros((prev) => ({
      ...prev,
      dataInicial: formatarDataInput(dataInicial),
      dataFinal: formatarDataInput(hoje),
    }));
  };

  const periodoSelecionado = (dias: PeriodoRapido) => {
    if (!filtros.dataInicial || !filtros.dataFinal) {
      return false;
    }

    const hoje = new Date();
    const inicial = new Date();

    inicial.setDate(hoje.getDate() - (dias - 1));

    return (
      filtros.dataInicial === formatarDataInput(inicial) &&
      filtros.dataFinal === formatarDataInput(hoje)
    );
  };

  return (
    <Box>
      {/* Cabeçalho */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        spacing={2}
        sx={{ mb: 3.5 }}
      >
        <Box>
          <Typography
            variant="h1"
            sx={{
              fontWeight: 700,
              letterSpacing: '-0.025em',
            }}
          >
            Relatórios de SLA
          </Typography>

          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ mt: 0.75 }}
          >
            Acompanhe o desempenho dos chamados e o cumprimento
            dos prazos de atendimento.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={handleExport}
          disabled={periodoInvalido || resumoSla.total === 0}
          sx={{
            minHeight: 42,
            px: 2.5,
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            boxShadow: 'none',
          }}
        >
          Exportar relatório
        </Button>
      </Stack>

      {/* Filtros */}
      <Paper
        variant="outlined"
        sx={{
          mb: 3,
          borderRadius: 3,
          overflow: 'hidden',
          borderColor: 'divider',
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          spacing={2}
          sx={{
            px: { xs: 2, md: 2.5 },
            py: 2,
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Stack
            direction="row"
            spacing={1.25}
            alignItems="center"
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                display: 'grid',
                placeItems: 'center',
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
              }}
            >
              <TuneRoundedIcon fontSize="small" />
            </Box>

            <Box>
              <Stack
                direction="row"
                spacing={1}
                alignItems="center"
              >
                <Typography
                  variant="subtitle2"
                  sx={{ fontWeight: 700 }}
                >
                  Filtros
                </Typography>

                {filtrosAtivos > 0 && (
                  <Chip
                    size="small"
                    color="primary"
                    label={`${filtrosAtivos} ${
                      filtrosAtivos === 1
                        ? 'ativo'
                        : 'ativos'
                    }`}
                    sx={{ height: 22 }}
                  />
                )}
              </Stack>

              <Typography
                variant="caption"
                color="text.secondary"
              >
                Refine os dados exibidos no relatório.
              </Typography>
            </Box>
          </Stack>

          {filtrosAtivos > 0 && (
            <Button
              size="small"
              color="inherit"
              startIcon={<FilterAltOffOutlinedIcon />}
              onClick={limparFiltros}
              sx={{
                textTransform: 'none',
                color: 'text.secondary',
              }}
            >
              Limpar filtros
            </Button>
          )}
        </Stack>

        <Box
          sx={{
            p: { xs: 2, md: 2.5 },
          }}
        >
          {/* Filtros principais */}
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Produto"
                value={filtros.produto}
                onChange={(event) =>
                  setFiltros((prev) => ({
                    ...prev,
                    produto: event.target.value,
                  }))
                }
              >
                <MenuItem value="todos">
                  Todos os produtos
                </MenuItem>

                {produtos.map((produto) => (
                  <MenuItem key={produto} value={produto}>
                    {produto}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Cliente / grupo empresa"
                value={filtros.grupoEmpresa}
                onChange={(event) =>
                  setFiltros((prev) => ({
                    ...prev,
                    grupoEmpresa: event.target.value,
                  }))
                }
              >
                <MenuItem value="todos">
                  Todos os clientes
                </MenuItem>

                {gruposEmpresa.map((grupo) => (
                  <MenuItem key={grupo} value={grupo}>
                    {grupo}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                select
                fullWidth
                size="small"
                label="Categoria do problema"
                value={filtros.categoria}
                onChange={(event) =>
                  setFiltros((prev) => ({
                    ...prev,
                    categoria: event.target.value,
                  }))
                }
              >
                <MenuItem value="todos">
                  Todas as categorias
                </MenuItem>

                {categorias.map((categoria) => (
                  <MenuItem
                    key={categoria}
                    value={categoria}
                  >
                    {categoria}
                  </MenuItem>
                ))}
              </TextField>
            </Grid>
          </Grid>

          {/* Período */}
          <Box
            sx={{
              mt: 2.5,
              pt: 2.5,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Stack
              direction={{ xs: 'column', lg: 'row' }}
              justifyContent="space-between"
              alignItems={{
                xs: 'flex-start',
                lg: 'center',
              }}
              spacing={2}
            >
              <Box>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600 }}
                >
                  Período
                </Typography>

                <Typography
                  variant="caption"
                  color="text.secondary"
                >
                  Selecione um período rápido ou informe as datas.
                </Typography>
              </Box>

              <Stack
                direction="row"
                spacing={1}
                flexWrap="wrap"
                useFlexGap
              >
                {[7, 30, 90].map((dias) => {
                  const periodo = dias as PeriodoRapido;

                  return (
                    <Button
                      key={dias}
                      size="small"
                      variant={
                        periodoSelecionado(periodo)
                          ? 'contained'
                          : 'outlined'
                      }
                      onClick={() =>
                        aplicarPeriodoRapido(periodo)
                      }
                      sx={{
                        minWidth: 78,
                        textTransform: 'none',
                        borderRadius: 2,
                        boxShadow: 'none',
                      }}
                    >
                      {dias} dias
                    </Button>
                  );
                })}
              </Stack>
            </Stack>

            <Grid
              container
              spacing={2}
              sx={{ mt: 0.5 }}
            >
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Data inicial"
                  value={filtros.dataInicial}
                  onChange={(event) =>
                    setFiltros((prev) => ({
                      ...prev,
                      dataInicial: event.target.value,
                    }))
                  }
                  InputLabelProps={{
                    shrink: true,
                  }}
                  error={periodoInvalido}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  size="small"
                  type="date"
                  label="Data final"
                  value={filtros.dataFinal}
                  onChange={(event) =>
                    setFiltros((prev) => ({
                      ...prev,
                      dataFinal: event.target.value,
                    }))
                  }
                  InputLabelProps={{
                    shrink: true,
                  }}
                  error={periodoInvalido}
                />
              </Grid>
            </Grid>

            {periodoInvalido && (
              <Typography
                variant="caption"
                color="error"
                sx={{
                  display: 'block',
                  mt: 1,
                }}
              >
                A data final não pode ser anterior à data inicial.
              </Typography>
            )}
          </Box>
        </Box>

        {/* Chips dos filtros ativos */}
        {filtrosAtivos > 0 && (
          <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            flexWrap="wrap"
            useFlexGap
            sx={{
              px: { xs: 2, md: 2.5 },
              py: 1.5,
              bgcolor: 'action.hover',
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ mr: 0.5 }}
            >
              Filtros aplicados
            </Typography>

            {filtros.produto !== 'todos' && (
              <Chip
                size="small"
                label={filtros.produto}
                onDelete={() =>
                  setFiltros((prev) => ({
                    ...prev,
                    produto: 'todos',
                  }))
                }
              />
            )}

            {filtros.grupoEmpresa !== 'todos' && (
              <Chip
                size="small"
                label={filtros.grupoEmpresa}
                onDelete={() =>
                  setFiltros((prev) => ({
                    ...prev,
                    grupoEmpresa: 'todos',
                  }))
                }
              />
            )}

            {filtros.categoria !== 'todos' && (
              <Chip
                size="small"
                label={filtros.categoria}
                onDelete={() =>
                  setFiltros((prev) => ({
                    ...prev,
                    categoria: 'todos',
                  }))
                }
              />
            )}

            {filtros.dataInicial && (
              <Chip
                size="small"
                label={`De ${formatarDataExibicao(
                  filtros.dataInicial,
                )}`}
                onDelete={() =>
                  setFiltros((prev) => ({
                    ...prev,
                    dataInicial: '',
                  }))
                }
              />
            )}

            {filtros.dataFinal && (
              <Chip
                size="small"
                label={`Até ${formatarDataExibicao(
                  filtros.dataFinal,
                )}`}
                onDelete={() =>
                  setFiltros((prev) => ({
                    ...prev,
                    dataFinal: '',
                  }))
                }
              />
            )}
          </Stack>
        )}
      </Paper>

      {/* KPIs */}
      <Grid
        container
        spacing={2}
        sx={{ mb: 3 }}
      >
        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            titulo="Total de chamados"
            valor={resumoSla.total}
            descricao="No período selecionado"
            icon={<ConfirmationNumberOutlinedIcon />}
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            titulo="Dentro do SLA"
            valor={dentroDoSla}
            descricao="Atendimentos no prazo"
            icon={<CheckCircleOutlineRoundedIcon />}
            tipo="success"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            titulo="SLA estourado"
            valor={resumoSla.estourados}
            descricao="Fora do prazo definido"
            icon={<ErrorOutlineRoundedIcon />}
            tipo="error"
          />
        </Grid>

        <Grid item xs={12} sm={6} lg={3}>
          <KpiCard
            titulo="Cumprimento do SLA"
            valor={`${resumoSla.percentualDentroSla}%`}
            descricao="Taxa de atendimento"
            icon={<SpeedRoundedIcon />}
            tipo="primary"
          />
        </Grid>
      </Grid>

      {/* Análises */}
      <Grid container spacing={2}>
        {/* Desempenho SLA */}
        <Grid item xs={12} lg={5}>
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 3,
              height: '100%',
            }}
          >
            <Box sx={{ mb: 3 }}>
              <Typography
                variant="subtitle1"
                sx={{ fontWeight: 700 }}
              >
                Desempenho do SLA
              </Typography>

              <Typography
                variant="body2"
                color="text.secondary"
              >
                Visão geral do cumprimento dos prazos.
              </Typography>
            </Box>

            {resumoSla.total === 0 ? (
              <EstadoVazio />
            ) : (
              <>
                <Box
                  sx={{
                    py: 3,
                    textAlign: 'center',
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: {
                        xs: '2.5rem',
                        md: '3.5rem',
                      },
                      lineHeight: 1,
                      fontWeight: 700,
                      letterSpacing: '-0.04em',
                      color: 'primary.main',
                    }}
                  >
                    {resumoSla.percentualDentroSla}%
                  </Typography>

                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 1 }}
                  >
                    dos chamados dentro do SLA
                  </Typography>
                </Box>

                <LinearProgress
                  variant="determinate"
                  value={resumoSla.percentualDentroSla}
                  sx={{
                    height: 8,
                    borderRadius: 99,
                    mb: 3,
                  }}
                />

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  spacing={2}
                >
                  <Box>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      No prazo
                    </Typography>

                    <Typography
                      variant="h6"
                      sx={{ fontWeight: 700 }}
                    >
                      {dentroDoSla}
                    </Typography>
                  </Box>

                  <Box sx={{ textAlign: 'right' }}>
                    <Typography
                      variant="caption"
                      color="text.secondary"
                    >
                      SLA estourado
                    </Typography>

                    <Typography
                      variant="h6"
                      color="error.main"
                      sx={{ fontWeight: 700 }}
                    >
                      {resumoSla.estourados}
                    </Typography>
                  </Box>
                </Stack>
              </>
            )}
          </Paper>
        </Grid>

        {/* Categorias */}
        <Grid item xs={12} lg={7}>
          <Paper
            variant="outlined"
            sx={{
              p: 3,
              borderRadius: 3,
              height: '100%',
            }}
          >
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="flex-start"
              spacing={2}
              sx={{ mb: 3 }}
            >
              <Box>
                <Typography
                  variant="subtitle1"
                  sx={{ fontWeight: 700 }}
                >
                  Categorias mais recorrentes
                </Typography>

                <Typography
                  variant="body2"
                  color="text.secondary"
                >
                  Principais motivos dos chamados no filtro atual.
                </Typography>
              </Box>

              {resumoSla.total > 0 && (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`${resumoSla.total} ${
                    resumoSla.total === 1
                      ? 'chamado'
                      : 'chamados'
                  }`}
                />
              )}
            </Stack>

            {periodoInvalido ? (
              <Typography
                variant="body2"
                color="error"
              >
                Corrija o período informado para visualizar
                os resultados.
              </Typography>
            ) : porCategoria.length === 0 ? (
              <EstadoVazio />
            ) : (
              <Stack spacing={2.25}>
                {porCategoria.map((item) => {
                  const percentual =
                    (item.quantidade / maiorQuantidade) * 100;

                  return (
                    <Box key={item.categoria}>
                      <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 0.75 }}
                      >
                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 500 }}
                        >
                          {item.categoria}
                        </Typography>

                        <Typography
                          variant="body2"
                          sx={{ fontWeight: 700 }}
                        >
                          {item.quantidade}
                        </Typography>
                      </Stack>

                      <LinearProgress
                        variant="determinate"
                        value={percentual}
                        sx={{
                          height: 7,
                          borderRadius: 99,
                        }}
                      />
                    </Box>
                  );
                })}
              </Stack>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

interface KpiCardProps {
  titulo: string;
  valor: string | number;
  descricao: string;
  icon: React.ReactNode;
  tipo?: 'primary' | 'success' | 'error';
}

function KpiCard({
  titulo,
  valor,
  descricao,
  icon,
  tipo = 'primary',
}: KpiCardProps) {
  const cor =
    tipo === 'success'
      ? 'success.main'
      : tipo === 'error'
        ? 'error.main'
        : 'primary.main';

  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        height: '100%',
        borderRadius: 3,
        transition:
          'transform 0.2s ease, box-shadow 0.2s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 2,
        },
      }}
    >
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="flex-start"
        spacing={2}
      >
        <Box>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ fontWeight: 500 }}
          >
            {titulo}
          </Typography>

          <Typography
            sx={{
              mt: 1,
              fontSize: '1.8rem',
              lineHeight: 1.2,
              fontWeight: 700,
              letterSpacing: '-0.03em',
            }}
          >
            {valor}
          </Typography>
        </Box>

        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: 2,
            display: 'grid',
            placeItems: 'center',
            bgcolor: 'action.hover',
            color: cor,
            flexShrink: 0,
          }}
        >
          {icon}
        </Box>
      </Stack>

      <Typography
        variant="caption"
        color="text.secondary"
        sx={{
          display: 'block',
          mt: 1.5,
        }}
      >
        {descricao}
      </Typography>
    </Paper>
  );
}

function EstadoVazio() {
  return (
    <Box
      sx={{
        minHeight: 150,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <Box>
        <Typography
          variant="body2"
          sx={{ fontWeight: 600 }}
        >
          Nenhum chamado encontrado
        </Typography>

        <Typography
          variant="caption"
          color="text.secondary"
        >
          Tente alterar ou remover alguns filtros.
        </Typography>
      </Box>
    </Box>
  );
}

/**
 * Acesso temporariamente liberado para todos.
 */
export function Relatorios() {
  return <RelatoriosContent />;
}