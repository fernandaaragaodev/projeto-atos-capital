import { ApiError, BASE_URL, clearToken, getToken, request } from './client';

export interface AnexoEnviado {
  nomeOriginal: string;
  nomeArmazenado: string;
  contentType: string;
  tamanhoBytes: number;
  url: string;
}

export interface RespostaEnvioAnexos {
  interacaoId: number;
  chamadoId: number;
  tipo: number;
  mensagem: string | null;
  criadoEm: string;
  anexos: AnexoEnviado[];
}

export interface AnexoListado extends AnexoEnviado {
  interacaoId: number;
  tipoInteracao: number;
  enviadoEm: string;
  autorId: number;
  autorNome: string;
}

export interface ListaAnexos {
  chamadoId: number;
  total: number;
  anexos: AnexoListado[];
}

/** POST /api/Chamados/{id}/anexos — multipart/form-data (campo 'arquivos' + 'mensagem' opcional). */
export function enviar(id: number | string, files: File[], mensagem?: string): Promise<RespostaEnvioAnexos> {
  const form = new FormData();
  files.forEach((file) => form.append('arquivos', file));
  if (mensagem) form.append('mensagem', mensagem);
  return request<RespostaEnvioAnexos>(`/api/Chamados/${id}/anexos`, { method: 'POST', body: form });
}

export function listar(id: number | string): Promise<ListaAnexos> {
  return request<ListaAnexos>(`/api/Chamados/${id}/anexos`);
}

/**
 * Download autenticado: o endpoint exige Bearer token, então não dá pra usar um <a href> puro.
 * Faz o fetch manual com o header de autorização e devolve um object URL do blob para o
 * chamador usar em <a href>/window.open e, ao final, revogar com URL.revokeObjectURL.
 */
export async function urlDownload(id: number | string, nomeArmazenado: string): Promise<string> {
  const headers = new Headers();
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${BASE_URL}/api/Chamados/${id}/anexos/${encodeURIComponent(nomeArmazenado)}`, { headers });
  } catch {
    throw new ApiError('Não foi possível conectar ao servidor.', 0);
  }

  if (response.status === 401) {
    clearToken();
    window.location.assign('/login');
    throw new ApiError('Sessão expirada.', 401);
  }

  if (!response.ok) {
    throw new ApiError('Não foi possível baixar o anexo.', response.status);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
