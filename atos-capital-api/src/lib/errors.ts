export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly codigo: string,
    mensagem: string,
    public readonly detalhes?: { campo: string; mensagem: string }[],
  ) {
    super(mensagem)
  }
}

export const naoEncontrado = (recurso: string) =>
  new AppError(404, `${recurso}_nao_encontrado`, `${recurso} não encontrado.`)
