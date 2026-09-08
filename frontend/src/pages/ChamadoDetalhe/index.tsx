import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Grid,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { StatusBadge } from '@/components/StatusBadge';
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

const STATUS_OPCOES: ChamadoStatus[] = ['aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado'];

/** Tela de detalhe do chamado — histórico, atribuição, status e auditoria. */
export function ChamadoDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { chamado, interacoes, auditoria, enviarInteracao, alterarStatus, atribuirAgente } = useApp(id);

  if (!chamado) {
    return (
      <Box>
        <Typography>Chamado não encontrado.</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/chamados')} sx={{ mt: 2 }}>
          Voltar para a fila
        </Button>
      </Box>
    );
  }

  const situacaoSla = calcularSituacaoSla(chamado);

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/chamados')} sx={{ mb: 2 }}>
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

      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} md={8}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'primary.main', mb: 1 }}>
              Descrição
            </Typography>
            <Typography variant="body2">{chamado.descricao}</Typography>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'primary.main', mb: 1.5 }}>
              Histórico da conversa
            </Typography>
            <Timeline interacoes={interacoes} />
            <Divider sx={{ my: 2 }} />
            <NovaInteracaoForm onSubmit={enviarInteracao} />
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
            <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'primary.main', mb: 1.5 }}>
              Atendimento
            </Typography>
            <Stack spacing={2}>
              <TextField
                select
                fullWidth
                size="small"
                label="Status"
                value={chamado.status}
                onChange={(e) => alterarStatus(e.target.value as ChamadoStatus)}
              >
                {STATUS_OPCOES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {statusLabel[status]}
                  </MenuItem>
                ))}
              </TextField>

              <TextField
                select
                fullWidth
                size="small"
                label="Agente responsável"
                value={chamado.agenteId ?? ''}
                onChange={(e) => atribuirAgente(e.target.value)}
              >
                <MenuItem value="">Não atribuído</MenuItem>
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
            <Typography variant="body2" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'primary.main', mb: 1.5 }}>
              Auditoria
            </Typography>
            <Stack spacing={1.5}>
              {auditoria.map((log) => (
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
    </Box>
  );
}
