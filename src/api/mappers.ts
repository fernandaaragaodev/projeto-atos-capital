import type { Chamado, Interacao, LogAuditoria, Anexo } from '@/types/chamado';
import type { AuthUser } from '@/auth/AuthContext';

/**
 * Camada única de tradução entre o JSON que a API devolve e os tipos do front.
 * Hoje é praticamente 1:1 (assumindo que o back-end em C# devolve camelCase,
 * padrão do System.Text.Json). Se o back usar outro formato (ex: PascalCase,
 * snake_case, ou nomes em inglês), ajuste SÓ aqui — o resto do app não muda.
 */
export function mapChamado(raw: Chamado): Chamado {
  return raw;
}

export function mapInteracao(raw: Interacao): Interacao {
  return raw;
}

export function mapLogAuditoria(raw: LogAuditoria): LogAuditoria {
  return raw;
}

export function mapAnexo(raw: Anexo): Anexo {
  return raw;
}

export function mapUsuario(raw: AuthUser): AuthUser {
  return raw;
}
