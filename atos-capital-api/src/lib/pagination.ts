import { z } from 'zod'

export const paginacaoQuery = z.object({
  pagina: z.coerce.number().int().min(1).default(1),
  por_pagina: z.coerce.number().int().min(1).default(20).transform((v) => Math.min(v, 100)),
})

export type PaginacaoQuery = z.infer<typeof paginacaoQuery>

export function meta(pagina: number, por_pagina: number, total: number) {
  return { pagina, por_pagina, total, total_paginas: Math.max(1, Math.ceil(total / por_pagina)) }
}
