import { Chip, Paper, Stack, Typography } from '@mui/material';
import dayjs from '@/utils/dateConfig';
import type { Interacao } from '@/types/chamado';

interface TimelineProps {
  interacoes: Interacao[];
}

/**
 * RF05 — Notas internas (fundo âmbar, marcadas "Interno") separadas visualmente
 * da conversa pública com o cliente (fundo neutro).
 */
export function Timeline({ interacoes }: TimelineProps) {
  if (interacoes.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
        Nenhuma interação registrada ainda.
      </Typography>
    );
  }

  return (
    <Stack spacing={1.5}>
      {interacoes.map((interacao) => {
        const interna = interacao.tipo === 'nota_interna';
        return (
          <Paper
            key={interacao.id}
            variant="outlined"
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: interna ? 'rgba(255,152,0,0.08)' : 'background.paper',
              borderColor: interna ? 'warning.main' : 'divider',
              borderStyle: interna ? 'dashed' : 'solid',
            }}
          >
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {interacao.autor}
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {interna && <Chip label="Interno" size="small" color="warning" variant="outlined" />}
                <Typography variant="caption" color="text.secondary">
                  {dayjs(interacao.criadoEm).format('DD/MM/YYYY HH:mm')}
                </Typography>
              </Stack>
            </Stack>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
              {interacao.mensagem}
            </Typography>
          </Paper>
        );
      })}
    </Stack>
  );
}
