/**
 * Tipos espelhando 1:1 os DTOs e enums do backend (sem nenhuma adaptação).
 * Fonte: backend/DTOs/*.cs e backend/Enums/*.cs.
 * Datas trafegam como string ISO (DateTime/DateTime? do backend).
 */

// =====================================================================
// Enums (backend/Enums/*.cs) — trafegam como número (sem JsonStringEnumConverter)
// =====================================================================

export enum StatusEnum {
  ABERTO = 0,
  EM_ANDAMENTO = 1,
  AGUARDANDO_CLIENTE = 2,
  RESOLVIDO = 3,
  FECHADO = 4,
}

export enum PrioridadeEnum {
  BAIXA = 0,
  MEDIA = 1,
  ALTA = 2,
  CRITICA = 3,
}

export enum PapelEnum {
  CLIENTE = 0,
  AGENTE = 1,
  SUPERVISOR = 2,
  ADMIN = 3,
}

export enum TipoInteracaoEnum {
  PUBLICA = 0,
  NOTA_INTERNA = 1,
}

// =====================================================================
// Auth (backend/DTOs/AuthDTOs.cs)
// =====================================================================

export interface Login {
  email: string;
}

export interface TokenResponse {
  token: string;
  nome: string;
  email: string;
  papel: PapelEnum;
  grupoEmpresaId: number;
}

/** GET /api/Auth/me. */
export interface UsuarioLogado {
  id: number;
  nome: string;
  email: string;
  papel: PapelEnum;
  grupoEmpresaId: number;
  grupoEmpresaNome: string;
}

// =====================================================================
// Listagem de chamados (backend/DTOs/ChamadoResumoDto.cs)
// =====================================================================

export interface ChamadoResumo {
  id: number;
  codigoPublico: string;
  produto: string;
  categoria: string;
  descricao: string;
  status: StatusEnum;
  prioridade: PrioridadeEnum;
  prazoResposta: string | null;
  prazoResolucao: string | null;
  criadoEm: string;
  aguardandoDesde: string | null;
  resolvidoEm: string | null;
  fechadoEm: string | null;
  usuarioId: number;
  usuarioNome: string;
  grupoEmpresaId: number;
  grupoEmpresaNome: string;
  agenteId: number | null;
  agenteNome: string | null;
  quantidadeInteracoes: number;
  slaEmRisco: boolean;
  slaEstourado: boolean;
}

/** Envelope paginado da listagem de chamados. */
export interface PaginaChamados {
  itens: ChamadoResumo[];
  page: number;
  pageSize: number;
  total: number;
  totalPaginas: number;
}

/** GET /api/Chamados/resumo — contadores para os cards do topo da fila, já filtrados pelas regras de papel. */
export interface ResumoChamados {
  total: number;
  emAberto: number;
  aguardandoCliente: number;
  comSlaEstourado: number;
  comSlaPertoDeEstourar: number;
}

// =====================================================================
// Detalhe do chamado (backend/DTOs/ChamadoDetalheDto.cs)
// =====================================================================

export interface Usuario {
  id: number;
  nome: string;
  email: string;
}

export interface Agente {
  id: number;
  nome: string;
}

export interface GrupoEmpresa {
  id: number;
  nome: string;
}

export interface SlaCategoria {
  id: number;
  produto: string;
  categoria: string;
  prioridade: PrioridadeEnum;
  tempoResposta: number;
  tempoResolucao: number;
}

export interface AutorInteracao {
  id: number;
  nome: string;
  papel: PapelEnum;
}

export interface Interacao {
  id: number;
  chamadoId: number;
  autor: AutorInteracao;
  tipo: TipoInteracaoEnum;
  mensagem: string;
  anexos: string | null;
  criadoEm: string;
}

export interface LogAuditoria {
  id: number;
  acao: string;
  campoAlterado: string;
  valorAnterior: string;
  valorNovo: string;
  usuarioNome: string;
  data: string;
}

export interface ChamadoDetalhe {
  id: number;
  codigoPublico: string;
  produto: string;
  categoria: string;
  descricao: string;
  status: StatusEnum;
  prioridade: PrioridadeEnum;
  prazoResposta: string | null;
  prazoResolucao: string | null;
  aguardandoDesde: string | null;
  criadoEm: string;
  resolvidoEm: string | null;
  fechadoEm: string | null;
  usuario: Usuario;
  agente: Agente | null;
  grupoEmpresa: GrupoEmpresa;
  slaCategoria: SlaCategoria | null;
  slaEmRisco: boolean;
  slaEstourado: boolean;
  interacoes: Interacao[];
  logsAuditoria: LogAuditoria[];
}

// =====================================================================
// Escrita de chamados (backend/DTOs/CriarChamadoDto.cs, CriarInteracaoDto.cs,
// AlterarStatusChamadoDto.cs, RespostaChamadoDto.cs)
// =====================================================================

export interface CriarChamado {
  produto: string;
  categoria: string;
  descricao: string;
  prioridade: PrioridadeEnum;
}

export interface CriarInteracao {
  mensagem: string;
  tipo: TipoInteracaoEnum;
  anexos: string | null;
}

/** Corpo do PATCH /api/Chamados/{id}/status. */
export interface AlterarStatus {
  status: StatusEnum;
  comentario: string | null;
}

export interface RespostaChamado {
  id: number;
  codigoPublico: string;
  produto: string;
  categoria: string;
  descricao: string;
  status: StatusEnum;
  prioridade: PrioridadeEnum;
  prazoResposta: string | null;
  prazoResolucao: string | null;
  criadoEm: string;
  usuarioId: number;
  grupoEmpresaId: number;
  agenteId: number | null;
  slaCategoriaId: number | null;
  aguardandoDesde: string | null;
  resolvidoEm: string | null;
  fechadoEm: string | null;
}

// =====================================================================
// Relatórios (backend/DTOs/RelatorioDtos.cs)
// =====================================================================

/** Filtros comuns dos relatórios, enviados via query string. */
export interface FiltroRelatorio {
  dataInicio?: string | null;
  dataFim?: string | null;
  grupoEmpresaId?: number | null;
  agenteId?: number | null;
  produto?: string | null;
}

export interface TotalPorStatus {
  status: StatusEnum;
  nome: string;
  total: number;
}

export interface TotalPorPrioridade {
  prioridade: PrioridadeEnum;
  nome: string;
  total: number;
}

export interface TotalPorProduto {
  produto: string;
  total: number;
  abertos: number;
  emAndamento: number;
  aguardandoCliente: number;
  resolvidos: number;
  fechados: number;
}

export interface TotalPorGrupoEmpresa {
  grupoEmpresaId: number;
  grupoEmpresa: string;
  total: number;
  emAberto: number;
  finalizados: number;
}

export interface TotalPorCategoria {
  categoria: string;
  total: number;
  emAberto: number;
  finalizados: number;
}

/** GET /api/Relatorios/resumo. */
export interface ResumoRelatorio {
  totalChamados: number;
  totaisPorStatus: TotalPorStatus[];
  abertosHoje: number;
  resolvidosNoPeriodo: number;
  emAbertoNoMomento: number;
  tempoMedioPrimeiraRespostaHoras: number | null;
  tempoMedioResolucaoHoras: number | null;
  chamadosComSlaResolucaoAvaliados: number;
  percentualDentroSlaResolucao: number | null;
  chamadosComSlaRespostaAvaliados: number;
  percentualDentroSlaResposta: number | null;
}

export interface RelatorioPorAgente {
  agenteId: number;
  agenteNome: string;
  chamadosAtribuidos: number;
  resolvidos: number;
  abertosNoMomento: number;
  tempoMedioResolucaoHoras: number | null;
  chamadosComSlaAvaliados: number;
  percentualSlaCumprido: number | null;
}

export interface PontoEvolucao {
  periodo: string;
  rotulo: string;
  abertos: number;
  resolvidos: number;
}

export interface EvolucaoRelatorio {
  granularidade: string;
  inicio: string;
  fim: string;
  serie: PontoEvolucao[];
}

export interface SlaPorDimensao {
  chave: string;
  totalChamados: number;
  comSla: number;
  resolucaoCumprida: number;
  resolucaoViolada: number;
  resolucaoPendente: number;
  percentualResolucaoCumprida: number | null;
  respostaCumprida: number;
  respostaViolada: number;
  respostaPendente: number;
  percentualRespostaCumprida: number | null;
}

/** GET /api/Relatorios/sla. */
export interface SlaCategorias {
  porProduto: SlaPorDimensao[];
  porCategoria: SlaPorDimensao[];
  porPrioridade: SlaPorDimensao[];
}

export interface ChamadoEmRiscoSla {
  id: number;
  codigoPublico: string;
  produto: string;
  categoria: string;
  status: StatusEnum;
  prioridade: PrioridadeEnum;
  grupoEmpresaId: number;
  grupoEmpresa: string;
  agenteId: number | null;
  agenteNome: string | null;
  criadoEm: string;
  prazoResposta: string | null;
  prazoResolucao: string | null;
  minutosParaPrazoResolucao: number;
  situacao: string;
  alertaRiscoSlaEm: string | null;
  alertaEstouroSlaEm: string | null;
  alertaRespostaAtrasadaEm: string | null;
}
