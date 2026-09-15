import { request, setToken } from './client';
import type { TokenResponse, UsuarioLogado } from './types';

/**
 * O backend hoje autentica só por e-mail (LoginDto só tem Email; ainda não valida senha).
 * Enviamos `senha` mesmo assim: campos desconhecidos no corpo são ignorados pelo model
 * binding do ASP.NET, então isso já deixa o front pronto para quando a validação chegar.
 */
export async function login(email: string, senha: string): Promise<TokenResponse> {
  const resposta = await request<TokenResponse>('/api/Auth/login', {
    method: 'POST',
    body: { email, senha },
  });
  setToken(resposta.token);
  return resposta;
}

export function me(): Promise<UsuarioLogado> {
  return request<UsuarioLogado>('/api/Auth/me');
}
