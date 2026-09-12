import { apiGet, apiPatch, apiPost } from './client';
import { mapChamado, mapInteracao } from './mappers';
import type { Chamado, ChamadoStatus, Interacao } from '@/types/chamado';

export interface FiltrosChamados {
  status?: ChamadoStatus;
  produto?: string;
  categoria?: string;
  busca?: string;
}

function toQuery(params: Record<string, string | undefined>): string {
  const entries = Object.entries(params).filter((entry): entry is [string, string] => Boolean(entry[1]));
  return entries.length ? `?${new URLSearchParams(entries)}` : '';
}

/** GET /chamados — RF02, fila de atendimento. */
export async function listar(filtros: FiltrosChamados = {}): Promise<Chamado[]> {
  const data = await apiGet<Chamado[]>(`/chamados${toQuery(filtros)}`);
  return data.map(mapChamado);
}

/** GET /chamados/resumo — cards da ResumeBar (RF07/RF09). */
export function resumo() {
  return apiGet<{ total: number; abertos: number; estourados: number; aguardandoCliente: number }>(
    '/chamados/resumo',
  );
}

/** POST /chamados — RF01, abertura de chamado. */
export async function abrir(dados: { produto: string; categoria: string; descricao: string }): Promise<Chamado> {
  const data = await apiPost<Chamado>('/chamados', dados);
  return mapChamado(data);
}

/** GET /chamados/:id — detalhe de um chamado específico. */
export async function buscarPorId(chamadoId: string): Promise<Chamado> {
  const data = await apiGet<Chamado>(`/chamados/${chamadoId}`);
  return mapChamado(data);
}

/** PATCH /chamados/:id/status — RF04. */
export async function mudarStatus(chamadoId: string, status: ChamadoStatus): Promise<Chamado> {
  const data = await apiPatch<Chamado>(`/chamados/${chamadoId}/status`, { status });
  return mapChamado(data);
}

/** PATCH /chamados/:id/agente — RF03. */
export async function atribuirAgente(chamadoId: string, agenteId: string): Promise<Chamado> {
  const data = await apiPatch<Chamado>(`/chamados/${chamadoId}/agente`, { agenteId });
  return mapChamado(data);
}

/** GET /agentes — lista para o seletor de atribuição. */
export function listarAgentes() {
  return apiGet<Array<{ id: string; nome: string }>>('/agentes');
}

/** GET /chamados/:id/interacoes — histórico da conversa (RF05). */
export async function listarInteracoes(chamadoId: string): Promise<Interacao[]> {
  const data = await apiGet<Interacao[]>(`/chamados/${chamadoId}/interacoes`);
  return data.map(mapInteracao);
}

/** POST /chamados/:id/interacoes — resposta pública ou nota interna (RF05). */
export async function adicionarInteracao(
  chamadoId: string,
  mensagem: string,
  tipo: 'publica' | 'nota_interna',
): Promise<Interacao> {
  const data = await apiPost<Interacao>(`/chamados/${chamadoId}/interacoes`, { mensagem, tipo });
  return mapInteracao(data);
}

/** GET /chamados/opcoes — produtos e categorias disponíveis pro formulário de abertura. */
export function listarOpcoes() {
  return apiGet<{ produtos: string[]; categorias: string[] }>('/chamados/opcoes');
}
