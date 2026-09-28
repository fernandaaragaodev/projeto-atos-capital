import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Alert, Box, Button, Divider, Grid, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatDate } from '@/utils/dateConfig';
import dayjs from '@/utils/dateConfig';
import {
  statusLabel,
  statusToVariant,
  prioridadeLabel,
  prioridadeToVariant,
  type ChamadoStatus,
} from '@/types/chamado';
import { AGENTES } from '@/pages/Chamados/useApp';
import { formatarTempoRestante, calcularSituacaoSla } from '@/pages/Chamados/slaUtils';
import { Timeline } from './components/Timeline';
import { NovaInteracaoForm } from './components/NovaInteracaoForm';
import { useApp } from './useApp';

interface AcaoStatus {
  label: string;
  icon: SvgIconComponent;
  color: 'primary' | 'success' | 'warning';
  variant: 'contained' | 'outlined';
  /** Mudanças que travam o chamado pedem confirmação antes de aplicar. */
  confirmacao?: string;
}

const ACOES_STATUS: Partial<Record<ChamadoStatus, AcaoStatus>> = {
  em_andamento: { label: 'Colocar em andamento', icon: PlayArrowIcon, color: 'primary', variant: 'outlined' },
  aguardando_cliente: { label: 'Aguardar cliente', icon: HourglassEmptyIcon, color: 'warning', variant: 'outlined' },
  resolvido: {
    label: 'Marcar como resolvido',
    icon: CheckCircleOutlineIcon,
    color: 'success',
    variant: 'contained',
    confirmacao:
      'Depois de resolvido o chamado fica travado: não aceita novas respostas, anexos nem troca de agente, e não pode ser reaberto. Só será possível fechá-lo.',
  },
  fechado: {
    label: 'Fechar chamado',
    icon: LockOutlinedIcon,
    color: 'primary',
    variant: 'contained',
    confirmacao: 'O fechamento é definitivo: o chamado não aceita mais nenhuma alteração.',
  },
};

const tituloSecaoSx = { fontWeight: 700, textTransform: 'uppercase', color: 'primary.main' } as const;

/** Tela de detalhe do chamado — conversa, atribuição, status e histórico de alterações. */
export function ChamadoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { chamado, interacoes, historico, travado, proximosStatus, enviarInteracao, alterarStatus, atribuirAgente } =
    useApp(id);
  const [statusAConfirmar, setStatusAConfirmar] = useState<ChamadoStatus | null>(null);

  if (!chamado) {
    return (
      <Box>
        <Typography>Chamado não encontrado.</Typography>
        <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/chamados')} sx={{ mt: 2 }}>
          Voltar para a fila
        </Button>
      </Box>
    );
  }

  const situacaoSla = calcularSituacaoSla(chamado);
  const acaoAConfirmar = statusAConfirmar ? ACOES_STATUS[statusAConfirmar] : undefined;

  const handleAcaoStatus = (status: ChamadoStatus) => {
    if (ACOES_STATUS[status]?.confirmacao) setStatusAConfirmar(status);
    else alterarStatus(status);
  };

  const confirmarStatus = () => {
    if (statusAConfirmar) alterarStatus(statusAConfirmar);
    setStatusAConfirmar(null);
  };

  return (
    <Box>
      <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={() => navigate('/chamados')} sx={{ mb: 2 }}>
        Voltar para a fila
      </Button>

      <Stack direction="row" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" spacing={2}>
        <Box>
          <Typography variant="h1">{chamado.codigoPublico}</Typography>
          <Typography variant="body2" color="text.secondary">
            {chamado.grupoEmpresaNome} · Aberto por {chamado.usuarioNome} em {formatDate(chamado.criadoEm)}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <StatusBadge label={prioridadeLabel[chamado.prioridade]} status={prioridadeToVariant[chamado.prioridade]} />
          <StatusBadge label={statusLabel[chamado.status]} status={statusToVariant[chamado.status]} />
        </Stack>
      </Stack>

      {travado && (
        <Alert severity="info" icon={<LockOutlinedIcon fontSize="inherit" />} sx={{ mt: 2 }}>
          {chamado.status === 'resolvido'
            ? 'Chamado resolvido e travado: não aceita novas respostas, anexos nem troca de agente. A única ação disponível é fechá-lo.'
            : 'Chamado fechado: não aceita mais nenhuma alteração.'}
        </Alert>
      )}

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ ...tituloSecaoSx, mb: 1 }}>
              Descrição
            </Typography>
            <Typography variant="body2">{chamado.descricao}</Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ ...tituloSecaoSx, mb: 1.5 }}>
              Histórico da conversa
            </Typography>
            <Timeline interacoes={interacoes} />
            {!travado && (
              <>
                <Divider sx={{ my: 2 }} />
                <NovaInteracaoForm onSubmit={enviarInteracao} />
              </>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ ...tituloSecaoSx, mb: 1.5 }}>
              Atendimento
            </Typography>
            <Stack spacing={2}>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  Status atual
                </Typography>
                <StatusBadge label={statusLabel[chamado.status]} status={statusToVariant[chamado.status]} />
              </Box>

              {proximosStatus.length > 0 && (
                <Stack spacing={1}>
                  {proximosStatus.map((status) => {
                    const acao = ACOES_STATUS[status];
                    if (!acao) return null;
                    const Icon = acao.icon;
                    return (
                      <Button
                        key={status}
                        fullWidth
                        variant={acao.variant}
                        color={acao.color}
                        startIcon={<Icon />}
                        onClick={() => handleAcaoStatus(status)}
                        sx={{ justifyContent: 'flex-start', textTransform: 'none' }}
                      >
                        {acao.label}
                      </Button>
                    );
                  })}
                </Stack>
              )}

              <TextField
                select
                fullWidth
                size="small"
                label="Agente responsável"
                value={chamado.agenteId ?? ''}
                onChange={(e) => atribuirAgente(e.target.value)}
                disabled={travado}
                helperText={travado ? 'Chamado travado: o agente não pode ser alterado.' : undefined}
              >
                <MenuItem value="">Não atribuído</MenuItem>
                {/* Agente vindo da API pode não estar na lista local: mantém o nome visível. */}
                {chamado.agenteId && !AGENTES.some((agente) => agente.id === chamado.agenteId) && (
                  <MenuItem value={chamado.agenteId}>{chamado.agenteNome ?? 'Agente atribuído'}</MenuItem>
                )}
                {AGENTES.map((agente) => (
                  <MenuItem key={agente.id} value={agente.id}>
                    {agente.nome}
                  </MenuItem>
                ))}
              </TextField>

              <Box>
                <Typography variant="caption" color="text.secondary">
                  Prazo de SLA
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontWeight: 600 }}
                  color={situacaoSla === 'estourado' ? 'error.main' : situacaoSla === 'proximo' ? 'warning.main' : 'text.primary'}
                >
                  {formatarTempoRestante(chamado)} ({dayjs(chamado.slaPrazo).format('DD/MM/YYYY HH:mm')})
                </Typography>
              </Box>
            </Stack>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ ...tituloSecaoSx, mb: 1.5 }}>
              Histórico
            </Typography>
            {historico.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Nenhuma alteração registrada ainda.
              </Typography>
            )}
            <Stack spacing={1.5}>
              {historico.map((log) => (
                <Box key={log.id}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {log.acao}
                  </Typography>
                  {log.campoAlterado && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {log.valorAnterior} → {log.valorNovo}
                    </Typography>
                  )}
                  <Typography variant="caption" color="text.secondary">
                    {log.usuario} · {dayjs(log.data).format('DD/MM/YYYY HH:mm')}
                  </Typography>
                </Box>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      <ConfirmDialog
        open={Boolean(acaoAConfirmar)}
        title={acaoAConfirmar?.label ?? ''}
        confirmLabel={acaoAConfirmar?.label ?? ''}
        confirmColor={acaoAConfirmar?.color}
        confirmIcon={acaoAConfirmar?.icon}
        onConfirm={confirmarStatus}
        onClose={() => setStatusAConfirmar(null)}
      >
        {acaoAConfirmar?.confirmacao}
      </ConfirmDialog>
    </Box>
  );
}
