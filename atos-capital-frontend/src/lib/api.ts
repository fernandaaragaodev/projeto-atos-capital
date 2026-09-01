const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3333'

export type ErroApi = {
  codigo: string
  mensagem: string
  detalhes?: { campo: string; mensagem: string }[]
  request_id: string
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly erro: ErroApi) {
    super(erro.mensagem)
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...init?.headers },
    cache: 'no-store',
  })
  if (res.status === 204) return undefined as T
  const body = await res.json()
  if (!res.ok) throw new ApiError(res.status, body.erro)
  return body as T
}
