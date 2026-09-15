import { request, toQueryString } from './client';
import { chamadoFromDetalhe, chamadoFromResumo, interacaoFromApi, logAuditoriaFromApi, prioridadeToApi, statusToApi, tipoInteracaoToApi } from './mappers';
import type {
  AlterarStatus,
  ChamadoDetalhe,
  CriarChamado,
  CriarInteracao,
  Interacao as ApiInteracao,
  PaginaChamados,
  ResumoChamados,
  RespostaChamado,
} from './types';
import type { Chamado, ChamadoStatus, Interacao, LogAuditoria, Prioridade } from '@/types/chamado';

export interface FiltrosChamados {
  status?: ChamadoStatus;
  prioridade?: Prioridade;
  agenteId?: number;
  busca?: string;
  pageSize?: number;
}

export interface PaginaDeChamados {
  itens: Chamado[];
  page: number;
  pageSize: number;
  total: number;
  totalPaginas: number;
}

export interface ChamadoComHistorico {
  chamado: Chamado;
  interacoes: Interacao[];
  auditoria: LogAuditoria[];
}

export interface AgenteResumo {
  id: number;
  nome: string;
  email: string;
}

export async function listar(filtros: FiltrosChamados = {}, page = 1): Promise<PaginaDeChamados> {
  const query = toQueryString({
    status: filtros.status ? statusToApi(filtros.status) : undefined,
    prioridade: filtros.prioridade ? prioridadeToApi(filtros.prioridade) : undefined,
    agenteId: filtros.agenteId,
    busca: filtros.busca,
    page,
    pageSize: filtros.pageSize,
  });
  const pagina = await request<PaginaChamados>(`/api/Chamados${query}`);
  return { ...pagina, itens: pagina.itens.map(chamadoFromResumo) };
}

export function resumo(): Promise<ResumoChamados> {
  return request<ResumoChamados>('/api/Chamados/resumo');
}

export async function obter(id: number | string): Promise<ChamadoComHistorico> {
  const dto = await request<ChamadoDetalhe>(`/api/Chamados/${id}`);
  const chamadoId = String(dto.id);
  return {
    chamado: chamadoFromDetalhe(dto),
    interacoes: dto.interacoes.map(interacaoFromApi),
    auditoria: dto.logsAuditoria.map((log) => logAuditoriaFromApi(log, chamadoId)),
  };
}

export function criar(dto: { produto: string; categoria: string; descricao: string; prioridade: Prioridade }): Promise<RespostaChamado> {
  const body: CriarChamado = {
    produto: dto.produto,
    categoria: dto.categoria,
    descricao: dto.descricao,
    prioridade: prioridadeToApi(dto.prioridade),
  };
  return request<RespostaChamado>('/api/Chamados', { method: 'POST', body });
}

export function alterarStatus(id: number | string, status: ChamadoStatus, comentario?: string): Promise<RespostaChamado> {
  const body: AlterarStatus = { status: statusToApi(status), comentario: comentario ?? null };
  return request<RespostaChamado>(`/api/Chamados/${id}/status`, { method: 'PATCH', body });
}

/** PATCH /api/Chamados/{id}/atribuir espera o id do agente cru no corpo (não um objeto). */
export function atribuir(id: number | string, agenteId: number): Promise<RespostaChamado> {
  return request<RespostaChamado>(`/api/Chamados/${id}/atribuir`, { method: 'PATCH', body: agenteId });
}

export function agentes(): Promise<AgenteResumo[]> {
  return request<AgenteResumo[]>('/api/Chamados/agentes');
}

export async function adicionarInteracao(id: number | string, mensagem: string, tipo: Interacao['tipo']): Promise<Interacao> {
  const body: CriarInteracao = { mensagem, tipo: tipoInteracaoToApi(tipo), anexos: null };
  const dto = await request<ApiInteracao>(`/api/Chamados/${id}/interacoes`, { method: 'POST', body });
  return interacaoFromApi(dto);
}

// slaCategorias(): sem endpoint correspondente no backend ainda (só existe internamente, usado ao
// criar um chamado). Fica pendente até o backend expor uma listagem das regras de SLA.
