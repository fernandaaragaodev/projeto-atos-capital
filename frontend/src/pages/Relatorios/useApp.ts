import { useMemo, useState } from 'react';
import { notify } from '@/utils/notify';
import { useApp as useChamadosApp } from '@/pages/Chamados/useApp';
import { calcularSituacaoSla } from '@/pages/Chamados/slaUtils';

export interface FiltrosRelatorio {
  produto: string;
  grupoEmpresa: string;
  categoria: string;
}

/** RF08 — Relatórios filtráveis por produto, cliente/grupo empresa, categoria e período. */
export function useApp() {
  const { chamados } = useChamadosApp();
  const [filtros, setFiltros] = useState<FiltrosRelatorio>({ produto: 'todos', grupoEmpresa: 'todos', categoria: 'todos' });

  const produtos = useMemo(() => Array.from(new Set(chamados.map((c) => c.produto))), [chamados]);
  const gruposEmpresa = useMemo(() => Array.from(new Set(chamados.map((c) => c.grupoEmpresaNome))), [chamados]);
  const categorias = useMemo(() => Array.from(new Set(chamados.map((c) => c.categoria))), [chamados]);

  const chamadosFiltrados = useMemo(() => {
    return chamados.filter(
      (c) =>
        (filtros.produto === 'todos' || c.produto === filtros.produto) &&
        (filtros.grupoEmpresa === 'todos' || c.grupoEmpresaNome === filtros.grupoEmpresa) &&
        (filtros.categoria === 'todos' || c.categoria === filtros.categoria),
    );
  }, [chamados, filtros]);

  const porCategoria = useMemo(() => {
    const contagem = new Map<string, number>();
    chamadosFiltrados.forEach((c) => contagem.set(c.categoria, (contagem.get(c.categoria) ?? 0) + 1));
    return Array.from(contagem.entries())
      .map(([categoria, quantidade]) => ({ categoria, quantidade }))
      .sort((a, b) => b.quantidade - a.quantidade);
  }, [chamadosFiltrados]);

  const resumoSla = useMemo(() => {
    const estourados = chamadosFiltrados.filter((c) => calcularSituacaoSla(c) === 'estourado').length;
    const noPrazo = chamadosFiltrados.filter((c) => calcularSituacaoSla(c) === 'no_prazo').length;
    const percentualDentroSla =
      chamadosFiltrados.length === 0 ? 0 : Math.round(((chamadosFiltrados.length - estourados) / chamadosFiltrados.length) * 100);
    return { estourados, noPrazo, percentualDentroSla, total: chamadosFiltrados.length };
  }, [chamadosFiltrados]);

  const handleExport = () => notify.success('Exportação do relatório iniciada');

  return { filtros, setFiltros, produtos, gruposEmpresa, categorias, chamadosFiltrados, porCategoria, resumoSla, handleExport };
}
