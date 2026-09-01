'use client'

import { useCallback, useEffect, useState } from 'react'
import { clientesApi } from './api'
import { ClienteForm } from './ClienteForm'
import type { Cliente, ClienteInput, Paginado } from './types'

export function ClientesPage() {
  const [dados, setDados] = useState<Paginado<Cliente> | null>(null)
  const [q, setQ] = useState('')
  const [pagina, setPagina] = useState(1)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [erro, setErro] = useState('')

  const carregar = useCallback(async () => {
    try {
      setErro('')
      setDados(await clientesApi.listar({ q, pagina }))
    } catch {
      setErro('Não foi possível carregar os clientes. A API está no ar?')
    }
  }, [q, pagina])

  useEffect(() => {
    carregar()
  }, [carregar])

  async function criar(body: ClienteInput) {
    await clientesApi.criar(body)
    await carregar()
  }

  async function atualizar(body: ClienteInput) {
    if (!editando) return
    await clientesApi.atualizar(editando.id, body)
    setEditando(null)
    await carregar()
  }

  async function remover(c: Cliente) {
    if (!confirm(`Excluir ${c.nome}?`)) return
    await clientesApi.remover(c.id)
    await carregar()
  }

  return (
    <main className="mx-auto grid max-w-4xl gap-6 p-6">
      <header>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-sm text-zinc-500">Atos Capital</p>
      </header>

      {editando ? (
        <ClienteForm key={editando.id} inicial={editando} onSalvar={atualizar} onCancelar={() => setEditando(null)} />
      ) : (
        <ClienteForm onSalvar={criar} />
      )}

      <section className="grid gap-3">
        <input
          className="w-full rounded border border-zinc-300 px-3 py-2 text-sm"
          placeholder="Buscar por nome ou e-mail…"
          value={q}
          onChange={(e) => {
            setQ(e.target.value)
            setPagina(1)
          }}
        />

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
          <table className="w-full text-sm">
            <thead className="bg-zinc-50 text-left text-zinc-600">
              <tr>
                <th className="px-3 py-2 font-medium">Nome</th>
                <th className="px-3 py-2 font-medium">E-mail</th>
                <th className="px-3 py-2 font-medium">Telefone</th>
                <th className="px-3 py-2 font-medium">Documento</th>
                <th className="px-3 py-2 font-medium">Status</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {dados?.data.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-center text-zinc-500">
                    Nenhum cliente encontrado.
                  </td>
                </tr>
              )}
              {dados?.data.map((c) => (
                <tr key={c.id} className="border-t border-zinc-100">
                  <td className="px-3 py-2">{c.nome}</td>
                  <td className="px-3 py-2">{c.email}</td>
                  <td className="px-3 py-2">{c.telefone ?? '—'}</td>
                  <td className="px-3 py-2">{c.documento ?? '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`rounded px-2 py-0.5 text-xs ${c.ativo ? 'bg-green-100 text-green-800' : 'bg-zinc-200 text-zinc-700'}`}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right whitespace-nowrap">
                    <button onClick={() => setEditando(c)} className="mr-3 text-zinc-700 underline">
                      Editar
                    </button>
                    <button onClick={() => remover(c)} className="text-red-600 underline">
                      Excluir
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {dados && dados.meta.total_paginas > 1 && (
          <div className="flex items-center justify-between text-sm text-zinc-600">
            <span>
              Página {dados.meta.pagina} de {dados.meta.total_paginas} · {dados.meta.total} clientes
            </span>
            <div className="flex gap-2">
              <button disabled={pagina <= 1} onClick={() => setPagina((p) => p - 1)} className="rounded border px-3 py-1 disabled:opacity-40">
                Anterior
              </button>
              <button
                disabled={pagina >= dados.meta.total_paginas}
                onClick={() => setPagina((p) => p + 1)}
                className="rounded border px-3 py-1 disabled:opacity-40"
              >
                Próxima
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
