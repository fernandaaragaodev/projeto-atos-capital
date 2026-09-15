import { useCallback, useEffect, useMemo, useState } from 'react';
import { notify } from '@/utils/notify';
import type { ActiveFilter } from '@/components/FilterChips';
import { STATUS_ABERTOS, type Chamado } from '@/types/chamado';
import type { NovoChamadoValues } from './components/NovoChamadoModal/useApp';
import { listar, resumo as buscarResumo, criar } from '@/api/chamados';
import { ApiError } from '@/api/client';

// TODO: sem endpoint de agentes com o shape { id: string, nome: string } usado pela atribuição
// (ainda local/não persistida) em ChamadoDetalhe — troca pendente para consumir GET /api/Chamados/agentes.
export const AGENTES = [
  { id: 'agt-01', nome: 'Marcos Vinícius' },
  { id: 'agt-02', nome: 'Camila Torres' },
  { id: 'agt-03', nome: 'Juliana Prado' },
];

interface Resumo {
  total: number;
  abertos: number;
  estourados: number;
  aguardandoCliente: number;
}

const RESUMO_VAZIO: Resumo = { total: 0, abertos: 0, estourados: 0, aguardandoCliente: 0 };

export function useApp() {
  const [chamados, setChamados] = useState<Chamado[]>([]);
  const [resumo, setResumo] = useState<Resumo>(RESUMO_VAZIO);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([
    { id: 'status-abertos', label: 'Status: em aberto' },
  ]);
  const [modalOpen, setModalOpen] = useState(false);

  const somenteAbertos = activeFilters.some((f) => f.id === 'status-abertos');

  const carregarChamados = useCallback(async () => {
    try {
      const pagina = await listar({ pageSize: 100 });
      setChamados(pagina.itens);
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Não foi possível carregar os chamados.');
    }
  }, []);

  const carregarResumo = useCallback(async () => {
    try {
      const dto = await buscarResumo();
      setResumo({
        total: dto.total,
        abertos: dto.emAberto,
        estourados: dto.comSlaEstourado,
        aguardandoCliente: dto.aguardandoCliente,
      });
    } catch {
      // Contadores do topo não são críticos: mantém os últimos valores conhecidos.
    }
  }, []);

  useEffect(() => {
    carregarChamados();
    carregarResumo();
  }, [carregarChamados, carregarResumo]);

  const filteredChamados = useMemo(() => {
    let lista = chamados;
    if (somenteAbertos) {
      lista = lista.filter((c) => STATUS_ABERTOS.includes(c.status));
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      lista = lista.filter(
        (c) =>
          c.codigoPublico.toLowerCase().includes(term) ||
          c.usuarioNome.toLowerCase().includes(term) ||
          c.grupoEmpresaNome.toLowerCase().includes(term) ||
          c.produto.toLowerCase().includes(term),
      );
    }
    return lista;
  }, [chamados, searchTerm, somenteAbertos]);

  const removeFilter = (id: string) => setActiveFilters((prev) => prev.filter((f) => f.id !== id));
  const openNewModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const createChamado = async (values: NovoChamadoValues) => {
    try {
      const resposta = await criar({
        produto: values.produto,
        categoria: values.categoria,
        descricao: values.descricao,
        prioridade: 'media',
      });
      notify.success(`Chamado ${resposta.codigoPublico} aberto com sucesso`);
      closeModal();
      await Promise.all([carregarChamados(), carregarResumo()]);
    } catch (err) {
      notify.error(err instanceof ApiError ? err.message : 'Não foi possível abrir o chamado.');
    }
  };

  const handleReload = () => {
    carregarChamados();
    carregarResumo();
    notify.success('Fila atualizada');
  };
  const handleExport = () => notify.success('Exportação iniciada');

  return {
    chamados: filteredChamados,
    resumo,
    searchTerm,
    setSearchTerm,
    activeFilters,
    removeFilter,
    modalOpen,
    openNewModal,
    closeModal,
    createChamado,
    handleReload,
    handleExport,
  };
}
