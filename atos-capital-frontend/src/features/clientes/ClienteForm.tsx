'use client'

import { useState } from 'react'
import { ApiError } from '@/lib/api'
import type { Cliente, ClienteInput } from './types'

type Props = {
  inicial?: Cliente
  onSalvar: (dados: ClienteInput) => Promise<void>
  onCancelar?: () => void
}

const input = 'w-full rounded border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900'

export function ClienteForm({ inicial, onSalvar, onCancelar }: Props) {
  const [nome, setNome] = useState(inicial?.nome ?? '')
  const [email, setEmail] = useState(inicial?.email ?? '')
  const [telefone, setTelefone] = useState(inicial?.telefone ?? '')
  const [documento, setDocumento] = useState(inicial?.documento ?? '')
  const [ativo, setAtivo] = useState(inicial?.ativo ?? true)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [erroGeral, setErroGeral] = useState('')
  const [salvando, setSalvando] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setErros({})
    setErroGeral('')
    setSalvando(true)
    try {
      await onSalvar({
        nome,
        email,
        telefone: telefone || undefined,
        documento: documento || undefined,
        ativo,
      })
      if (!inicial) {
        setNome(''); setEmail(''); setTelefone(''); setDocumento(''); setAtivo(true)
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.erro.detalhes?.length) {
          setErros(Object.fromEntries(err.erro.detalhes.map((d) => [d.campo, d.mensagem])))
        } else {
          setErroGeral(err.erro.mensagem)
        }
      } else {
        setErroGeral('Falha ao comunicar com a API.')
      }
    } finally {
      setSalvando(false)
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-3 rounded-lg border border-zinc-200 bg-white p-4">
      <h2 className="text-base font-semibold">{inicial ? 'Editar cliente' : 'Novo cliente'}</h2>

      <Campo label="Nome" erro={erros.nome}>
        <input className={input} value={nome} onChange={(e) => setNome(e.target.value)} required />
      </Campo>
      <Campo label="E-mail" erro={erros.email}>
        <input className={input} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      </Campo>
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo label="Telefone (só dígitos)" erro={erros.telefone}>
          <input className={input} value={telefone} onChange={(e) => setTelefone(e.target.value)} placeholder="11999998888" />
        </Campo>
        <Campo label="CPF/CNPJ (só dígitos)" erro={erros.documento}>
          <input className={input} value={documento} onChange={(e) => setDocumento(e.target.value)} placeholder="12345678901" />
        </Campo>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo
      </label>

      {erroGeral && <p className="text-sm text-red-600">{erroGeral}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={salvando}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
        {onCancelar && (
          <button type="button" onClick={onCancelar} className="rounded border border-zinc-300 px-4 py-2 text-sm">
            Cancelar
          </button>
        )}
      </div>
    </form>
  )
}

function Campo({ label, erro, children }: { label: string; erro?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="text-zinc-700">{label}</span>
      {children}
      {erro && <span className="text-xs text-red-600">{erro}</span>}
    </label>
  )
}
