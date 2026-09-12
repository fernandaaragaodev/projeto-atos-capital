import { apiGet, apiPost } from './client';
import { mapUsuario } from './mappers';
import type { AuthUser } from '@/auth/AuthContext';

export interface LoginResponse {
  token: string;
  usuario: AuthUser;
}

/** POST /auth/login — RF10 ponto de entrada, o back-end valida e devolve o JWT. */
export async function login(email: string, senha: string): Promise<LoginResponse> {
  const data = await apiPost<LoginResponse>('/auth/login', { email, senha });
  return { token: data.token, usuario: mapUsuario(data.usuario) };
}

/** GET /auth/me — busca o usuário dono do token atual (chamado no boot do app). */
export async function me(): Promise<AuthUser> {
  const data = await apiGet<AuthUser>('/auth/me');
  return mapUsuario(data);
}
