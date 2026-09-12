import { apiGet, apiGetBlob, apiUpload } from './client';
import { mapAnexo } from './mappers';
import type { Anexo } from '@/types/chamado';

/** POST /chamados/:id/anexos — RF11, multipart/form-data. */
export async function enviar(chamadoId: string, arquivos: File[]): Promise<Anexo[]> {
  const formData = new FormData();
  arquivos.forEach((arquivo) => formData.append('arquivos', arquivo));
  const data = await apiUpload<Anexo[]>(`/chamados/${chamadoId}/anexos`, formData);
  return data.map(mapAnexo);
}

/** GET /chamados/:id/anexos */
export async function listar(chamadoId: string): Promise<Anexo[]> {
  const data = await apiGet<Anexo[]>(`/chamados/${chamadoId}/anexos`);
  return data.map(mapAnexo);
}

/**
 * GET /anexos/:id/download — precisa ir com o token (por isso não é um link comum);
 * baixa o arquivo como blob e dispara o download no navegador.
 */
export async function baixar(anexoId: string, nomeArquivo: string): Promise<void> {
  const blob = await apiGetBlob(`/anexos/${anexoId}/download`);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  window.URL.revokeObjectURL(url);
}
