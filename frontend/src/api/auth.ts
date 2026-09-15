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

/**
 * SSO: troca o token assinado pelo portal Atos Capital (recebido na URL de acesso à
 * tela de suporte) por um token da própria API, fazendo upsert transparente do usuário.
 */
export function sso(tokenPortal: string): Promise<TokenResponse> {
  return request<TokenResponse>('/api/Auth/sso', {
    method: 'POST',
    body: { token: tokenPortal },
  });
}

/**
 * Endpoint ainda não existe no backend (não há fluxo de recuperação de senha
 * implementado). Fica pronto no front para quando o backend expuser a rota.
 */
export function esqueciSenha(email: string): Promise<void> {
  return request<void>('/api/Auth/esqueci-senha', {
    method: 'POST',
    body: { email },
  });
}
