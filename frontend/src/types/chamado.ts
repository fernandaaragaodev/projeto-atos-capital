import type { StatusVariant } from '@/components/StatusBadge';

/** RF04 — estados do ciclo de vida do chamado (Seção 2.2 do Termo de Referência). */
export type ChamadoStatus = 'aberto' | 'em_andamento' | 'aguardando_cliente' | 'resolvido' | 'fechado';

export type Prioridade = 'baixa' | 'media' | 'alta' | 'critica';

/** RF12 — papéis de acesso previstos no termo. */
export type Papel = 'cliente' | 'agente' | 'supervisor' | 'admin';

export interface Anexo {
  id: string;
  nome: string;
  tamanhoKb: number;
  url?: string;
}

export interface Chamado {
  id: string;
  codigoPublico: string;
  usuarioId: string;
  usuarioNome: string;
  grupoEmpresaId: string;
  grupoEmpresaNome: string;
  produto: string;
  categoria: string;
  descricao: string;
  status: ChamadoStatus;
  prioridade: Prioridade;
  agenteId?: string;
  agenteNome?: string;
  slaPrazo: string; // ISO — RF07/RF09
  criadoEm: string; // ISO
  fechadoEm?: string; // ISO
  anexos: Anexo[];
  /** Calculados pela API (evita recalcular no front quando o dado já vem do backend). */
  slaEmRisco?: boolean;
  slaEstourado?: boolean;
}

/** RF05 — interação pública (visível ao cliente) ou nota interna (visível só à equipe). */
export interface Interacao {
  id: string;
  chamadoId: string;
  autor: string;
  tipo: 'publica' | 'nota_interna';
  mensagem: string;
  anexos?: Anexo[];
  criadoEm: string;
}

/** RF13 — trilha de auditoria das alterações do chamado. */
export interface LogAuditoria {
  id: string;
  chamadoId: string;
  usuario: string;
  acao: string;
  campoAlterado?: string;
  valorAnterior?: string;
  valorNovo?: string;
  data: string;
}

export const statusLabel: Record<ChamadoStatus, string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  aguardando_cliente: 'Aguardando cliente',
  resolvido: 'Resolvido',
  fechado: 'Fechado',
};

/** Paleta do Design System só cobre success/warning/error/info/purple — mapeado por semântica do estado. */
export const statusToVariant: Record<ChamadoStatus, StatusVariant> = {
  aberto: 'info',
  em_andamento: 'purple',
  aguardando_cliente: 'warning',
  resolvido: 'success',
  fechado: 'success',
};

export const prioridadeLabel: Record<Prioridade, string> = {
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  critica: 'Crítica',
};

export const prioridadeToVariant: Record<Prioridade, StatusVariant> = {
  baixa: 'success',
  media: 'info',
  alta: 'warning',
  critica: 'error',
};

export const STATUS_ABERTOS: ChamadoStatus[] = ['aberto', 'em_andamento', 'aguardando_cliente'];
