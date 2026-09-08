import dayjs from '@/utils/dateConfig';
import type { Dayjs } from 'dayjs';
import { STATUS_ABERTOS, type Chamado } from '@/types/chamado';

export type SlaSituacao = 'no_prazo' | 'proximo' | 'estourado' | 'encerrado';

/** RF09 — considera "próximo do limite" quando restam menos de 2 horas de SLA. */
const LIMIAR_PROXIMO_HORAS = 2;

export function calcularSituacaoSla(chamado: Chamado, agora: Dayjs = dayjs()): SlaSituacao {
  if (!STATUS_ABERTOS.includes(chamado.status)) return 'encerrado';

  const prazo = dayjs(chamado.slaPrazo);
  const horasRestantes = prazo.diff(agora, 'hour', true);

  if (horasRestantes < 0) return 'estourado';
  if (horasRestantes <= LIMIAR_PROXIMO_HORAS) return 'proximo';
  return 'no_prazo';
}

export function formatarTempoRestante(chamado: Chamado, agora: Dayjs = dayjs()): string {
  const prazo = dayjs(chamado.slaPrazo);
  const horas = prazo.diff(agora, 'hour');
  if (!STATUS_ABERTOS.includes(chamado.status)) return '—';
  if (horas < 0) return `Estourado há ${Math.abs(horas)}h`;
  if (horas === 0) return 'Vence em menos de 1h';
  return `Vence em ${horas}h`;
}

export const slaSituacaoLabel: Record<SlaSituacao, string> = {
  no_prazo: 'No prazo',
  proximo: 'Próximo do limite',
  estourado: 'SLA estourado',
  encerrado: '—',
};
