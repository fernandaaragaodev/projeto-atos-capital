import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Skeleton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import ConfirmationNumberRoundedIcon from '@mui/icons-material/ConfirmationNumberRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';
import ArrowForwardRoundedIcon from '@mui/icons-material/ArrowForwardRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import PriorityHighRoundedIcon from '@mui/icons-material/PriorityHighRounded';
import { useAuth } from '@/auth/AuthContext';
import { useThemeMode } from '@/theme/ThemeModeProvider';
import { calcularSituacaoSla, formatarTempoRestante } from '@/pages/Chamados/slaUtils';
import type { Chamado, Prioridade } from '@/types/chamado';
const agora = new Date();
const horasAtras = (h: number) => new Date(agora.getTime() - h * 3_600_000).toISOString();
const horasNaFrente = (h: number) => new Date(agora.getTime() + h * 3_600_000).toISOString();

const chamados: Chamado[] = [
  { id: '1', codigoPublico: 'CH-2026-0091', usuarioId: 'usr-010', usuarioNome: 'Renata Alves', grupoEmpresaId: 'grp-002', grupoEmpresaNome: 'Cliente Nortec Filial SP', produto: 'Joe SFA B1', categoria: 'Integração SAP B1', descricao: 'Pedido de venda não sincroniza com o SAP Business One após atualização.', status: 'em_andamento', prioridade: 'alta', agenteId: 'agt-01', agenteNome: 'Marcos Vinícius', slaPrazo: horasNaFrente(1), criadoEm: horasAtras(6), anexos: [] },
  { id: '2', codigoPublico: 'CH-2026-0092', usuarioId: 'usr-011', usuarioNome: 'Diego Ferreira', grupoEmpresaId: 'grp-003', grupoEmpresaNome: 'Cliente Vitalle Matriz', produto: 'Portal Atos Capital', categoria: 'Acesso e login', descricao: 'Usuário não consegue acessar o portal, erro de token expirado.', status: 'aberto', prioridade: 'critica', slaPrazo: horasNaFrente(-3), criadoEm: horasAtras(9), anexos: [] },
  { id: '3', codigoPublico: 'CH-2026-0093', usuarioId: 'usr-012', usuarioNome: 'Paula Menezes', grupoEmpresaId: 'grp-002', grupoEmpresaNome: 'Cliente Nortec Filial SP', produto: 'Joe SFA B1', categoria: 'Relatórios', descricao: 'Relatório de comissão de vendas apresenta valores duplicados.', status: 'aguardando_cliente', prioridade: 'media', agenteId: 'agt-02', agenteNome: 'Camila Torres', slaPrazo: horasNaFrente(20), criadoEm: horasAtras(30), anexos: [] },
  { id: '4', codigoPublico: 'CH-2026-0087', usuarioId: 'usr-013', usuarioNome: 'João Pedro Lima', grupoEmpresaId: 'grp-004', grupoEmpresaNome: 'Cliente Ferrari Matriz', produto: 'Portal Atos Capital', categoria: 'Dúvida funcional', descricao: 'Como configurar alçadas de aprovação no módulo financeiro?', status: 'resolvido', prioridade: 'baixa', agenteId: 'agt-01', agenteNome: 'Marcos Vinícius', slaPrazo: horasAtras(2), criadoEm: horasAtras(48), fechadoEm: horasAtras(4), anexos: [] },
  { id: '5', codigoPublico: 'CH-2026-0080', usuarioId: 'usr-010', usuarioNome: 'Renata Alves', grupoEmpresaId: 'grp-002', grupoEmpresaNome: 'Cliente Nortec Filial SP', produto: 'Joe SFA B1', categoria: 'Integração SAP B1', descricao: 'Cadastro de novos produtos não replica pro catálogo do portal.', status: 'fechado', prioridade: 'media', agenteId: 'agt-02', agenteNome: 'Camila Torres', slaPrazo: horasAtras(70), criadoEm: horasAtras(96), fechadoEm: horasAtras(72), anexos: [] },
];

const prioridadeConfig: Record<Prioridade, { label: string; color: string }> = {
  critica: { label: 'Crítica', color: 'error.main' },
  alta: { label: 'Alta', color: 'warning.main' },
  media: { label: 'Média', color: 'info.main' },
  baixa: { label: 'Baixa', color: 'success.main' },
};

function MetricCard({ label, value, helper, icon, tone = 'primary', loading }: { label: string; value: string | number; helper: string; icon: React.ReactNode; tone?: 'primary' | 'warning' | 'error' | 'success'; loading?: boolean }) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.25,
        borderRadius: 3,
        height: '100%',
        transition: 'transform .2s ease, box-shadow .2s ease, border-color .2s ease',
        '&:hover': { transform: 'translateY(-3px)', boxShadow: 6, borderColor: 'primary.main' },
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box sx={{ flex: 1 }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 600 }}>{label}</Typography>
          {loading ? <Skeleton width={55} height={48} /> : <Typography sx={{ fontSize: 32, fontWeight: 700, lineHeight: 1.2, mt: .5 }}>{value}</Typography>}
          <Typography variant="caption" color="text.secondary">{helper}</Typography>
        </Box>
        <Box sx={{ width: 42, height: 42, borderRadius: 2.5, display: 'grid', placeItems: 'center', bgcolor: `${tone === 'primary' ? 'primary' : tone}.main`, color: '#fff', opacity: .9 }}>
          {icon}
        </Box>
      </Stack>
    </Paper>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { mode } = useThemeMode();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  const resumo = useMemo(() => {
    const ativos = chamados.filter((c) => ['aberto', 'em_andamento', 'aguardando_cliente'].includes(c.status));
    const estourados = ativos.filter((c) => calcularSituacaoSla(c) === 'estourado').length;
    const resolvidos = chamados.filter((c) => c.status === 'resolvido' || c.status === 'fechado').length;
    return { total: chamados.length, ativos: ativos.length, estourados, resolvidos };
  }, []);

  const slaPercent = Math.round(((resumo.total - resumo.estourados) / resumo.total) * 100);
  const priorityData = (['critica', 'alta', 'media', 'baixa'] as Prioridade[]).map((p) => ({ ...prioridadeConfig[p], value: chamados.filter((c) => c.prioridade === p).length }));
  const maxPriority = Math.max(1, ...priorityData.map((item) => item.value));

  const refresh = () => {
    setLoading(true);
    window.setTimeout(() => {
      setLastUpdate(new Date());
      setLoading(false);
    }, 650);
  };

  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', md: 'center' }} spacing={2} sx={{ mb: 3 }}>
        <Box>
          <Typography variant="h1" sx={{ mb: .5 }}>Olá, {user?.nome || 'Usuário'} 👋</Typography>
          <Typography color="text.secondary">Aqui está um resumo da operação da Atos Capital.</Typography>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
            <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: 'success.main', animation: 'pulse 1.8s infinite', '@keyframes pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: .35 } } }} />
            <Typography variant="caption" color="text.secondary">Última atualização: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</Typography>
          </Stack>
        </Box>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Tooltip title="Atualizar indicadores">
            <span><IconButton onClick={refresh} disabled={loading} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>{loading ? <CircularProgress size={20} /> : <RefreshRoundedIcon />}</IconButton></span>
          </Tooltip>
          <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={() => navigate('/chamados')} sx={{ borderRadius: 2.5, px: 2.25 }}>
            Abrir chamado
          </Button>
        </Stack>
      </Stack>

      <Alert severity="info" icon={<TrendingUpRoundedIcon />} sx={{ mb: 2.5, borderRadius: 2.5 }}>
        Existem <strong>{resumo.ativos} chamados ativos</strong> e <strong>{resumo.estourados} SLA(s) estourado(s)</strong> que merecem acompanhamento.
      </Alert>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }, gap: 2, mb: 2 }}>
        <MetricCard label="Total de chamados" value={resumo.total} helper="Base atual" icon={<ConfirmationNumberRoundedIcon />} loading={loading} />
        <MetricCard label="Em atendimento" value={resumo.ativos} helper="Acompanhamento ativo" icon={<AccessTimeRoundedIcon />} loading={loading} tone="warning" />
        <MetricCard label="SLA estourado" value={resumo.estourados} helper="Requer atenção" icon={<ErrorOutlineRoundedIcon />} loading={loading} tone="error" />
        <MetricCard label="Resolvidos" value={resumo.resolvidos} helper={`${Math.round((resumo.resolvidos / resumo.total) * 100)}% do total`} icon={<CheckCircleOutlineRoundedIcon />} loading={loading} tone="success" />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1.6fr) minmax(320px, .9fr)' }, gap: 2, mb: 2 }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Box><Typography variant="h6" sx={{ fontWeight: 700 }}>Chamados recentes</Typography><Typography variant="caption" color="text.secondary">Acompanhe os atendimentos mais recentes.</Typography></Box>
            <Button size="small" endIcon={<ArrowForwardRoundedIcon />} onClick={() => navigate('/chamados')}>Ver todos</Button>
          </Stack>
          <Stack divider={<Divider flexItem />}>
            {chamados.slice(0, 4).map((chamado) => {
              const situacao = calcularSituacaoSla(chamado);
              return (
                <Box key={chamado.id} onClick={() => navigate(`/chamados/${chamado.id}`)} sx={{ py: 1.5, px: 1, borderRadius: 2, cursor: 'pointer', transition: 'background .2s ease', '&:hover': { bgcolor: 'action.hover' } }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={1}>
                    <Box sx={{ minWidth: 0 }}>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: .5 }}>
                        <Typography variant="caption" color="text.secondary">{chamado.codigoPublico}</Typography>
                        <Chip size="small" label={prioridadeConfig[chamado.prioridade].label} sx={{ height: 22, color: prioridadeConfig[chamado.prioridade].color, fontWeight: 700 }} />
                      </Stack>
                      <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chamado.descricao}</Typography>
                      <Typography variant="caption" color="text.secondary">{chamado.grupoEmpresaNome}</Typography>
                    </Box>
                    <Stack alignItems={{ xs: 'flex-start', sm: 'flex-end' }} spacing={.5}>
                      <Chip size="small" label={chamado.status.replace('_', ' ')} sx={{ textTransform: 'capitalize', fontWeight: 600 }} />
                      <Typography variant="caption" color={situacao === 'estourado' ? 'error.main' : 'text.secondary'} sx={{ fontWeight: situacao === 'estourado' ? 700 : 400 }}>
                        {formatarTempoRestante(chamado)}
                      </Typography>
                    </Stack>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Paper>

        <Stack spacing={2}>
          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Saúde do SLA</Typography>
            <Typography variant="caption" color="text.secondary">Chamados dentro do prazo</Typography>
            <Stack direction="row" alignItems="center" spacing={2} sx={{ mt: 2 }}>
              <Typography sx={{ fontSize: 36, fontWeight: 700 }}>{slaPercent}%</Typography>
              <Box sx={{ flex: 1 }}><LinearProgress variant="determinate" value={slaPercent} sx={{ height: 9, borderRadius: 5, '& .MuiLinearProgress-bar': { transition: 'transform 1s ease' } }} /></Box>
            </Stack>
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}><Typography variant="caption" color="text.secondary">{resumo.total - resumo.estourados} dentro do SLA</Typography><Typography variant="caption" color="error.main" sx={{ fontWeight: 700 }}>{resumo.estourados} estourado(s)</Typography></Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 1.5 }}>Ações rápidas</Typography>
            <Stack spacing={1}>
              <Button fullWidth variant="outlined" startIcon={<AddCircleOutlineIcon />} onClick={() => navigate('/chamados')} sx={{ justifyContent: 'flex-start', borderRadius: 2 }}>Novo chamado</Button>
              <Button fullWidth variant="outlined" startIcon={<ConfirmationNumberRoundedIcon />} onClick={() => navigate('/chamados')} sx={{ justifyContent: 'flex-start', borderRadius: 2 }}>Consultar chamados</Button>
              <Button fullWidth variant="outlined" startIcon={<TrendingUpRoundedIcon />} onClick={() => navigate('/relatorios')} sx={{ justifyContent: 'flex-start', borderRadius: 2 }}>Ver relatórios de SLA</Button>
            </Stack>
          </Paper>
        </Stack>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1.15fr .85fr' }, gap: 2 }}>
        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}><AccessTimeRoundedIcon color="primary" /><Box><Typography variant="h6" sx={{ fontWeight: 700 }}>Volume por dia</Typography><Typography variant="caption" color="text.secondary">Últimos 7 dias</Typography></Box></Stack>
          <Stack direction="row" alignItems="flex-end" justifyContent="space-between" spacing={1} sx={{ height: 150, px: 1 }}>
            {[2, 4, 3, 6, 5, 7, 5].map((value, index) => (
              <Box key={index} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: .75 }}>
                <Typography variant="caption" sx={{ fontWeight: 700 }}>{value}</Typography>
                <Box sx={{ width: '65%', maxWidth: 34, height: `${value * 16}px`, borderRadius: '7px 7px 2px 2px', bgcolor: mode === 'dark' ? 'primary.light' : 'primary.main', transition: 'height .5s ease, opacity .2s', '&:hover': { opacity: .7 } }} />
                <Typography variant="caption" color="text.secondary">{['13', '14', '15', '16', '17', '18', '19'][index]}</Typography>
              </Box>
            ))}
          </Stack>
        </Paper>

        <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3 }}>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}><PriorityHighRoundedIcon color="primary" /><Box><Typography variant="h6" sx={{ fontWeight: 700 }}>Por prioridade</Typography><Typography variant="caption" color="text.secondary">Distribuição atual</Typography></Box></Stack>
          <Stack spacing={1.7}>
            {priorityData.map((item) => (
              <Box key={item.label}>
                <Stack direction="row" justifyContent="space-between" sx={{ mb: .5 }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{item.label}</Typography><Typography variant="body2" sx={{ fontWeight: 700 }}>{item.value}</Typography></Stack>
                <LinearProgress variant="determinate" value={(item.value / maxPriority) * 100} sx={{ height: 7, borderRadius: 4, '& .MuiLinearProgress-bar': { bgcolor: item.color, borderRadius: 4 } }} />
              </Box>
            ))}
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
