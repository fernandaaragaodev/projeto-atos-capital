import type {
  ChamadoResumo,
  ChamadoDetalhe,
  Interacao as ApiInteracao,
  LogAuditoria as ApiLogAuditoria,
  StatusEnum,
  PrioridadeEnum,
  PapelEnum,
  TipoInteracaoEnum,
} from '@/api/types';
import {
  type Anexo,
  type Chamado,
  type ChamadoStatus,
  type Interacao,
  type LogAuditoria,
  type Papel,
  type Prioridade,
  statusLabel,
} from '@/types/chamado';

// =====================================================================
// Enums — a ordem de cada lista espelha o valor numérico (0..N) do enum da API.
// =====================================================================

const STATUS_POR_INDICE: ChamadoStatus[] = ['aberto', 'em_andamento', 'aguardando_cliente', 'resolvido', 'fechado'];
const PRIORIDADE_POR_INDICE: Prioridade[] = ['baixa', 'media', 'alta', 'critica'];
const PAPEL_POR_INDICE: Papel[] = ['cliente', 'agente', 'supervisor', 'admin'];
const TIPO_INTERACAO_POR_INDICE: Interacao['tipo'][] = ['publica', 'nota_interna'];

export const statusFromApi = (status: StatusEnum): ChamadoStatus => STATUS_POR_INDICE[status];
export const statusToApi = (status: ChamadoStatus): StatusEnum => STATUS_POR_INDICE.indexOf(status) as StatusEnum;

export const prioridadeFromApi = (prioridade: PrioridadeEnum): Prioridade => PRIORIDADE_POR_INDICE[prioridade];
export const prioridadeToApi = (prioridade: Prioridade): PrioridadeEnum =>
  PRIORIDADE_POR_INDICE.indexOf(prioridade) as PrioridadeEnum;

export const papelFromApi = (papel: PapelEnum): Papel => PAPEL_POR_INDICE[papel];
export const papelToApi = (papel: Papel): PapelEnum => PAPEL_POR_INDICE.indexOf(papel) as PapelEnum;

export const tipoInteracaoFromApi = (tipo: TipoInteracaoEnum): Interacao['tipo'] => TIPO_INTERACAO_POR_INDICE[tipo];
export const tipoInteracaoToApi = (tipo: Interacao['tipo']): TipoInteracaoEnum =>
  TIPO_INTERACAO_POR_INDICE.indexOf(tipo) as TipoInteracaoEnum;

// =====================================================================
// Anexos — Interacao.Anexos da API é uma string JSON (array de AnexoInfo) ou null.
// =====================================================================

interface AnexoInfoApi {
  nomeOriginal?: unknown;
  nomeArmazenado?: unknown;
  tamanhoBytes?: unknown;
  url?: unknown;
}

/** Faz o parse seguro do JSON de anexos da API; qualquer formato inesperado vira lista vazia. */
export function parseAnexosJson(anexosJson: string | null): Anexo[] {
  if (!anexosJson) return [];
  let bruto: unknown;
  try {
    bruto = JSON.parse(anexosJson);
  } catch {
    return [];
  }
  if (!Array.isArray(bruto)) return [];

  return (bruto as AnexoInfoApi[])
    .filter((item) => typeof item?.nomeArmazenado === 'string')
    .map((item) => ({
      id: item.nomeArmazenado as string,
      nome: typeof item.nomeOriginal === 'string' ? item.nomeOriginal : (item.nomeArmazenado as string),
      tamanhoKb: typeof item.tamanhoBytes === 'number' ? Math.round(item.tamanhoBytes / 1024) : 0,
      url: typeof item.url === 'string' ? item.url : undefined,
    }));
}

// =====================================================================
// Chamado — API (Usuario/Agente/GrupoEmpresa aninhados) -> modelo plano do front.
// =====================================================================

export function chamadoFromResumo(dto: ChamadoResumo): Chamado {
  return {
    id: String(dto.id),
    codigoPublico: dto.codigoPublico,
    usuarioId: String(dto.usuarioId),
    usuarioNome: dto.usuarioNome,
    grupoEmpresaId: String(dto.grupoEmpresaId),
    grupoEmpresaNome: dto.grupoEmpresaNome,
    produto: dto.produto,
    categoria: dto.categoria,
    descricao: dto.descricao,
    status: statusFromApi(dto.status),
    prioridade: prioridadeFromApi(dto.prioridade),
    agenteId: dto.agenteId != null ? String(dto.agenteId) : undefined,
    agenteNome: dto.agenteNome ?? undefined,
    // sem SlaCategoria vinculada a API não define prazo de resolução
    slaPrazo: dto.prazoResolucao ?? '',
    criadoEm: dto.criadoEm,
    fechadoEm: dto.fechadoEm ?? undefined,
    // Anexos do chamado vêm por Interacao (parseAnexosJson) ou GET /anexos, não no resumo/detalhe.
    anexos: [],
    slaEmRisco: dto.slaEmRisco,
    slaEstourado: dto.slaEstourado,
  };
}

export function chamadoFromDetalhe(dto: ChamadoDetalhe): Chamado {
  return {
    id: String(dto.id),
    codigoPublico: dto.codigoPublico,
    usuarioId: String(dto.usuario.id),
    usuarioNome: dto.usuario.nome,
    grupoEmpresaId: String(dto.grupoEmpresa.id),
    grupoEmpresaNome: dto.grupoEmpresa.nome,
    produto: dto.produto,
    categoria: dto.categoria,
    descricao: dto.descricao,
    status: statusFromApi(dto.status),
    prioridade: prioridadeFromApi(dto.prioridade),
    agenteId: dto.agente ? String(dto.agente.id) : undefined,
    agenteNome: dto.agente?.nome,
    slaPrazo: dto.prazoResolucao ?? '',
    criadoEm: dto.criadoEm,
    fechadoEm: dto.fechadoEm ?? undefined,
    anexos: [],
    slaEmRisco: dto.slaEmRisco,
    slaEstourado: dto.slaEstourado,
  };
}

// =====================================================================
// Interação — Autor.Nome -> autor; Anexos (JSON) -> Anexo[].
// =====================================================================

export function interacaoFromApi(dto: ApiInteracao): Interacao {
  return {
    id: String(dto.id),
    chamadoId: String(dto.chamadoId),
    autor: dto.autor.nome,
    tipo: tipoInteracaoFromApi(dto.tipo),
    mensagem: dto.mensagem,
    anexos: parseAnexosJson(dto.anexos),
    criadoEm: dto.criadoEm,
  };
}

// =====================================================================
// Auditoria — UsuarioNome -> usuario, Data -> data; traduz valores de Status para o label do front.
// =====================================================================

/** Ex.: campoAlterado "Status" com valor "EM_ANDAMENTO" -> "Em andamento". Demais campos/valores passam direto. */
function traduzirValorAuditoria(campoAlterado: string, valor: string): string {
  if (campoAlterado !== 'Status') return valor;
  const status = STATUS_POR_INDICE.find((s) => s.toUpperCase() === valor.toUpperCase());
  return status ? statusLabel[status] : valor;
}

export function logAuditoriaFromApi(dto: ApiLogAuditoria, chamadoId: string): LogAuditoria {
  return {
    id: String(dto.id),
    chamadoId,
    usuario: dto.usuarioNome,
    acao: dto.acao,
    campoAlterado: dto.campoAlterado || undefined,
    valorAnterior: traduzirValorAuditoria(dto.campoAlterado, dto.valorAnterior),
    valorNovo: traduzirValorAuditoria(dto.campoAlterado, dto.valorNovo),
    data: dto.data,
  };
}
