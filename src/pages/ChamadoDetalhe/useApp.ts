import { useMemo, useState } from 'react';
import { notify } from '@/utils/notify';
import { useAuth } from '@/auth/AuthContext';
import { AGENTES } from '@/pages/Chamados/useApp';
import type { Chamado, ChamadoStatus, Interacao, LogAuditoria } from '@/types/chamado';
import { statusLabel } from '@/types/chamado';

// Reaproveita o mesmo mock da fila para manter os dados consistentes durante a navegação.
import { useApp as useChamadosApp } from '@/pages/Chamados/useApp';

const mockInteracoes: Record<string, Interacao[]> = {
  '1': [
    {
      id: 'i1',
      chamadoId: '1',
      autor: 'Renata Alves',
      tipo: 'publica',
      mensagem: 'O pedido 4521 não aparece no SAP mesmo depois de reprocessar a integração.',
      criadoEm: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    },
    {
      id: 'i2',
      chamadoId: '1',
      autor: 'Marcos Vinícius',
      tipo: 'nota_interna',
      mensagem: 'Verificar log do job de sincronização no ambiente do cliente antes de responder.',
      criadoEm: new Date(Date.now() - 4 * 3_600_000).toISOString(),
    },
    {
      id: 'i3',
      chamadoId: '1',
      autor: 'Marcos Vinícius',
      tipo: 'publica',
      mensagem: 'Identificamos o problema na fila de integração e já estamos corrigindo.',
      criadoEm: new Date(Date.now() - 3 * 3_600_000).toISOString(),
    },
  ],
};

const mockAuditoria: Record<string, LogAuditoria[]> = {
  '1': [
    {
      id: 'a1',
      chamadoId: '1',
      usuario: 'Sistema',
      acao: 'Chamado criado',
      data: new Date(Date.now() - 6 * 3_600_000).toISOString(),
    },
    {
      id: 'a2',
      chamadoId: '1',
      usuario: 'Marcos Vinícius',
      acao: 'Atribuição de agente',
      campoAlterado: 'agente',
      valorAnterior: '—',
      valorNovo: 'Marcos Vinícius',
      data: new Date(Date.now() - 5.5 * 3_600_000).toISOString(),
    },
    {
      id: 'a3',
      chamadoId: '1',
      usuario: 'Marcos Vinícius',
      acao: 'Status alterado',
      campoAlterado: 'status',
      valorAnterior: 'Aberto',
      valorNovo: 'Em andamento',
      data: new Date(Date.now() - 5 * 3_600_000).toISOString(),
    },
  ],
};

/** RF02–RF05, RF11, RF13 — tela de detalhe do chamado. */
export function useApp(chamadoId: string | undefined) {
  const { user } = useAuth();
  const { chamados: todosChamados } = useChamadosApp();
  const [interacoesPorChamado, setInteracoesPorChamado] = useState(mockInteracoes);
  const [auditoriaPorChamado, setAuditoriaPorChamado] = useState(mockAuditoria);
  const [statusOverride, setStatusOverride] = useState<Record<string, ChamadoStatus>>({});
  const [agenteOverride, setAgenteOverride] = useState<Record<string, string>>({});

  const chamadoBase = useMemo(
    () => todosChamados.find((c) => c.id === chamadoId),
    [todosChamados, chamadoId],
  );

  const chamado: Chamado | undefined = useMemo(() => {
    if (!chamadoBase) return undefined;
    const agenteId = agenteOverride[chamadoBase.id];
    const agente = AGENTES.find((a) => a.id === agenteId);
    return {
      ...chamadoBase,
      status: statusOverride[chamadoBase.id] ?? chamadoBase.status,
      agenteId: agenteId ?? chamadoBase.agenteId,
      agenteNome: agente?.nome ?? chamadoBase.agenteNome,
    };
  }, [chamadoBase, statusOverride, agenteOverride]);

  const interacoes = chamadoId ? interacoesPorChamado[chamadoId] ?? [] : [];
  const auditoria = chamadoId ? auditoriaPorChamado[chamadoId] ?? [] : [];

  const registrarAuditoria = (log: Omit<LogAuditoria, 'id' | 'chamadoId' | 'data'>) => {
    if (!chamadoId) return;
    const novo: LogAuditoria = {
      ...log,
      id: `a-${Date.now()}`,
      chamadoId,
      data: new Date().toISOString(),
    };
    setAuditoriaPorChamado((prev) => ({ ...prev, [chamadoId]: [...(prev[chamadoId] ?? []), novo] }));
  };

  const enviarInteracao = (mensagem: string, tipo: 'publica' | 'nota_interna') => {
    if (!chamadoId) return;
    const nova: Interacao = {
      id: `i-${Date.now()}`,
      chamadoId,
      autor: user.nome,
      tipo,
      mensagem,
      criadoEm: new Date().toISOString(),
    };
    setInteracoesPorChamado((prev) => ({ ...prev, [chamadoId]: [...(prev[chamadoId] ?? []), nova] }));
    notify.success(tipo === 'publica' ? 'Resposta enviada ao cliente' : 'Nota interna registrada');
  };

  const alterarStatus = (novoStatus: ChamadoStatus) => {
    if (!chamadoId || !chamado) return;
    const statusAnterior = chamado.status;
    setStatusOverride((prev) => ({ ...prev, [chamadoId]: novoStatus }));
    registrarAuditoria({
      usuario: user.nome,
      acao: 'Status alterado',
      campoAlterado: 'status',
      valorAnterior: statusLabel[statusAnterior],
      valorNovo: statusLabel[novoStatus],
    });
    notify.success(`Status atualizado para "${statusLabel[novoStatus]}"`);
  };

  const atribuirAgente = (agenteId: string) => {
    if (!chamadoId) return;
    const agente = AGENTES.find((a) => a.id === agenteId);
    setAgenteOverride((prev) => ({ ...prev, [chamadoId]: agenteId }));
    registrarAuditoria({
      usuario: user.nome,
      acao: 'Atribuição de agente',
      campoAlterado: 'agente',
      valorAnterior: chamado?.agenteNome ?? '—',
      valorNovo: agente?.nome ?? '—',
    });
    notify.success(`Chamado atribuído a ${agente?.nome}`);
  };

  return { chamado, interacoes, auditoria, enviarInteracao, alterarStatus, atribuirAgente };
}
