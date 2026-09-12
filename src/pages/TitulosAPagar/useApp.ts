import { useMemo, useState } from 'react';
import { notify } from '@/utils/notify';
import type { ActiveFilter } from '@/components/FilterChips';
import type { Titulo } from './types';

const mockTitulos: Titulo[] = [
  { id: '1', fornecedor: 'Fornecedor Alpha Ltda', documento: 'NF-00123', vencimento: '2026-09-10', valor: 15420.5, status: 'pendente' },
  { id: '2', fornecedor: 'Beta Serviços S.A.', documento: 'NF-00124', vencimento: '2026-08-28', valor: 3890.0, status: 'atrasado' },
  { id: '3', fornecedor: 'Gamma Suprimentos', documento: 'NF-00125', vencimento: '2026-09-20', valor: 7600.9, status: 'pendente' },
  { id: '4', fornecedor: 'Delta Consultoria', documento: 'NF-00126', vencimento: '2026-07-15', valor: 2200.0, status: 'pago' },
  { id: '5', fornecedor: 'Epsilon Logística', documento: 'NF-00127', vencimento: '2026-09-05', valor: 12800.0, status: 'pendente' },
  { id: '6', fornecedor: 'Zeta Tecnologia', documento: 'NF-00128', vencimento: '2026-08-01', valor: 990.75, status: 'atrasado' },
];

export function useApp() {
  const [titulos, setTitulos] = useState<Titulo[]>(mockTitulos);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([
    { id: 'status-pendente', label: 'Status: Pendente' },
  ]);
  const [modalOpen, setModalOpen] = useState(false);

  const filteredTitulos = useMemo(() => {
    if (!searchTerm) return titulos;
    const term = searchTerm.toLowerCase();
    return titulos.filter(
      (titulo) => titulo.fornecedor.toLowerCase().includes(term) || titulo.documento.toLowerCase().includes(term),
    );
  }, [titulos, searchTerm]);

  const resumo = useMemo(() => {
    const total = titulos.reduce((acc, t) => acc + t.valor, 0);
    const atrasados = titulos.filter((t) => t.status === 'atrasado').length;
    const pendentes = titulos.filter((t) => t.status === 'pendente').length;
    return { total, atrasados, pendentes, quantidade: titulos.length };
  }, [titulos]);

  const removeFilter = (id: string) => {
    setActiveFilters((prev) => prev.filter((f) => f.id !== id));
  };

  const openNewModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const createTitulo = (data: Omit<Titulo, 'id' | 'status'>) => {
    setTitulos((prev) => [...prev, { ...data, id: String(prev.length + 1), status: 'pendente' }]);
    notify.success('Registro salvo com sucesso');
    closeModal();
  };

  const handleReload = () => notify.success('Lista atualizada');
  const handleExport = () => notify.success('Exportação iniciada');

  return {
    titulos: filteredTitulos,
    resumo,
    searchTerm,
    setSearchTerm,
    activeFilters,
    removeFilter,
    modalOpen,
    openNewModal,
    closeModal,
    createTitulo,
    handleReload,
    handleExport,
  };
}
