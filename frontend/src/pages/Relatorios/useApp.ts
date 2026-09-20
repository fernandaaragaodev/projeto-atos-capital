import { useMemo, useState } from 'react';

import { notify } from '@/utils/notify';
import { useApp as useChamadosApp } from '@/pages/Chamados/useApp';
import { calcularSituacaoSla } from '@/pages/Chamados/slaUtils';

export interface FiltrosRelatorio {
  produto: string;
  grupoEmpresa: string;
  categoria: string;
  dataInicial: string;
  dataFinal: string;
}

const FILTROS_INICIAIS: FiltrosRelatorio = {
  produto: 'todos',
  grupoEmpresa: 'todos',
  categoria: 'todos',
  dataInicial: '',
  dataFinal: '',
};

/**
 * RF08 — Relatórios filtráveis por:
 * - produto;
 * - cliente/grupo empresa;
 * - categoria;
 * - período.
 */
export function useApp() {
  const { chamados } = useChamadosApp();

  const [filtros, setFiltros] =
    useState<FiltrosRelatorio>(FILTROS_INICIAIS);

  const produtos = useMemo(
    () =>
      Array.from(
        new Set(chamados.map((chamado) => chamado.produto)),
      ).sort(),
    [chamados],
  );

  const gruposEmpresa = useMemo(
    () =>
      Array.from(
        new Set(
          chamados.map(
            (chamado) => chamado.grupoEmpresaNome,
          ),
        ),
      ).sort(),
    [chamados],
  );

  const categorias = useMemo(
    () =>
      Array.from(
        new Set(
          chamados.map((chamado) => chamado.categoria),
        ),
      ).sort(),
    [chamados],
  );

  const periodoInvalido =
    Boolean(filtros.dataInicial) &&
    Boolean(filtros.dataFinal) &&
    filtros.dataInicial > filtros.dataFinal;

  const chamadosFiltrados = useMemo(() => {
    if (periodoInvalido) {
      return [];
    }

    return chamados.filter((chamado) => {
      const correspondeProduto =
        filtros.produto === 'todos' ||
        chamado.produto === filtros.produto;

      const correspondeGrupo =
        filtros.grupoEmpresa === 'todos' ||
        chamado.grupoEmpresaNome === filtros.grupoEmpresa;

      const correspondeCategoria =
        filtros.categoria === 'todos' ||
        chamado.categoria === filtros.categoria;

      /*
       * criadoEm pode conter horário e timezone.
       * YYYY-MM-DD permite comparar somente a data.
       */
      const dataChamado = chamado.criadoEm.slice(0, 10);

      const correspondeDataInicial =
        !filtros.dataInicial ||
        dataChamado >= filtros.dataInicial;

      const correspondeDataFinal =
        !filtros.dataFinal ||
        dataChamado <= filtros.dataFinal;

      return (
        correspondeProduto &&
        correspondeGrupo &&
        correspondeCategoria &&
        correspondeDataInicial &&
        correspondeDataFinal
      );
    });
  }, [chamados, filtros, periodoInvalido]);

  const porCategoria = useMemo(() => {
    const contagem = new Map<string, number>();

    chamadosFiltrados.forEach((chamado) => {
      contagem.set(
        chamado.categoria,
        (contagem.get(chamado.categoria) ?? 0) + 1,
      );
    });

    return Array.from(contagem.entries())
      .map(([categoria, quantidade]) => ({
        categoria,
        quantidade,
      }))
      .sort(
        (a, b) => b.quantidade - a.quantidade,
      );
  }, [chamadosFiltrados]);

  const resumoSla = useMemo(() => {
    const estourados = chamadosFiltrados.filter(
      (chamado) =>
        calcularSituacaoSla(chamado) === 'estourado',
    ).length;

    const noPrazo = chamadosFiltrados.filter(
      (chamado) =>
        calcularSituacaoSla(chamado) === 'no_prazo',
    ).length;

    const percentualDentroSla =
      chamadosFiltrados.length === 0
        ? 0
        : Math.round(
            ((chamadosFiltrados.length - estourados) /
              chamadosFiltrados.length) *
              100,
          );

    return {
      estourados,
      noPrazo,
      percentualDentroSla,
      total: chamadosFiltrados.length,
    };
  }, [chamadosFiltrados]);

  const limparFiltros = () => {
    setFiltros(FILTROS_INICIAIS);
  };

  const handleExport = () => {
    if (periodoInvalido) {
      notify.error(
        'A data inicial não pode ser posterior à data final.',
      );
      return;
    }

    if (chamadosFiltrados.length === 0) {
      notify.error(
        'Não existem chamados para exportar com os filtros selecionados.',
      );
      return;
    }

    // A exportação real pode ser conectada ao backend posteriormente.
    notify.success(
      `Exportação iniciada com ${chamadosFiltrados.length} chamado(s).`,
    );
  };

  return {
    filtros,
    setFiltros,

    produtos,
    gruposEmpresa,
    categorias,

    chamadosFiltrados,
    porCategoria,
    resumoSla,

    periodoInvalido,
    limparFiltros,
    handleExport,
  };
}