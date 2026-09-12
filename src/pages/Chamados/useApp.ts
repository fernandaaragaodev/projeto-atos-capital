import { useMemo, useState } from 'react';
import { notify } from '@/utils/notify';
import { useAuth } from '@/auth/AuthContext';
import type { ActiveFilter } from '@/components/FilterChips';
import { STATUS_ABERTOS, type Chamado } from '@/types/chamado';
import { calcularSituacaoSla } from './slaUtils';
import type { NovoChamadoValues } from './components/NovoChamadoModal/useApp';

const AGORA = new Date();
const horasAtras = (h: number) => new Date(AGORA.getTime() - h * 3_600_000).toISOString();
const horasNaFrente = (h: number) => new Date(AGORA.getTime() + h * 3_600_000).toISOString();

const mockChamados: Chamado[] = [
  {
    id: '1',
    codigoPublico: 'CH-2026-0091',
    usuarioId: 'usr-010',
    usuarioNome: 'Renata Alves',
    grupoEmpresaId: 'grp-002',
    grupoEmpresaNome: 'Cliente Nortec Filial SP',
    produto: 'Joe SFA B1',
    categoria: 'Integração SAP B1',
    descricao: 'Pedido de venda não sincroniza com o SAP Business One após atualização.',
    status: 'em_andamento',
    prioridade: 'alta',
    agenteId: 'agt-01',
    agenteNome: 'Marcos Vinícius',
    slaPrazo: horasNaFrente(1),
    criadoEm: horasAtras(6),
    anexos: [],
  },
  {
    id: '2',
    codigoPublico: 'CH-2026-0092',
    usuarioId: 'usr-011',
    usuarioNome: 'Diego Ferreira',
    grupoEmpresaId: 'grp-003',
    grupoEmpresaNome: 'Cliente Vitalle Matriz',
    produto: 'Portal Atos Capital',
    categoria: 'Acesso e login',
    descricao: 'Usuário não consegue acessar o portal, erro de token expirado.',
    status: 'aberto',
    prioridade: 'critica',
    slaPrazo: horasNaFrente(-3),
    criadoEm: horasAtras(9),
    anexos: [],
  },
  {
    id: '3',
    codigoPublico: 'CH-2026-0093',
    usuarioId: 'usr-012',
    usuarioNome: 'Paula Menezes',
    grupoEmpresaId: 'grp-002',
    grupoEmpresaNome: 'Cliente Nortec Filial SP',
    produto: 'Joe SFA B1',
    categoria: 'Relatórios',
    descricao: 'Relatório de comissão de vendas apresenta valores duplicados.',
    status: 'aguardando_cliente',
    prioridade: 'media',
    agenteId: 'agt-02',
    agenteNome: 'Camila Torres',
    slaPrazo: horasNaFrente(20),
    criadoEm: horasAtras(30),
    anexos: [],
  },
  {
    id: '4',
    codigoPublico: 'CH-2026-0087',
    usuarioId: 'usr-013',
    usuarioNome: 'João Pedro Lima',
    grupoEmpresaId: 'grp-004',
    grupoEmpresaNome: 'Cliente Ferrari Matriz',
    produto: 'Portal Atos Capital',
    categoria: 'Dúvida funcional',
    descricao: 'Como configurar alçadas de aprovação no módulo financeiro?',
    status: 'resolvido',
    prioridade: 'baixa',
    agenteId: 'agt-01',
    agenteNome: 'Marcos Vinícius',
    slaPrazo: horasAtras(2),
    criadoEm: horasAtras(48),
    fechadoEm: horasAtras(4),
    anexos: [],
  },
  {
    id: '5',
    codigoPublico: 'CH-2026-0080',
    usuarioId: 'usr-010',
    usuarioNome: 'Renata Alves',
    grupoEmpresaId: 'grp-002',
    grupoEmpresaNome: 'Cliente Nortec Filial SP',
    produto: 'Joe SFA B1',
    categoria: 'Integração SAP B1',
    descricao: 'Cadastro de novos produtos não replica pro catálogo do portal.',
    status: 'fechado',
    prioridade: 'media',
    agenteId: 'agt-02',
    agenteNome: 'Camila Torres',
    slaPrazo: horasAtras(70),
    criadoEm: horasAtras(96),
    fechadoEm: horasAtras(72),
    anexos: [],
  },
];

export const AGENTES = [
  { id: 'agt-01', nome: 'Marcos Vinícius' },
  { id: 'agt-02', nome: 'Camila Torres' },
  { id: 'agt-03', nome: 'Juliana Prado' },
];

let sequencia = mockChamados.length;

export function useApp() {
  const { user } = useAuth();
  const [chamados, setChamados] = useState<Chamado[]>(mockChamados);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilters, setActiveFilters] = useState<ActiveFilter[]>([
    { id: 'status-abertos', label: 'Status: em aberto' },
  ]);
  const [modalOpen, setModalOpen] = useState(false);

  const somenteAbertos = activeFilters.some((f) => f.id === 'status-abertos');

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

  const resumo = useMemo(() => {
    const abertos = chamados.filter((c) => STATUS_ABERTOS.includes(c.status));
    const estourados = abertos.filter((c) => calcularSituacaoSla(c) === 'estourado').length;
    const aguardandoCliente = chamados.filter((c) => c.status === 'aguardando_cliente').length;
    return { total: chamados.length, abertos: abertos.length, estourados, aguardandoCliente };
  }, [chamados]);

  const removeFilter = (id: string) => setActiveFilters((prev) => prev.filter((f) => f.id !== id));
  const openNewModal = () => setModalOpen(true);
  const closeModal = () => setModalOpen(false);

  const createChamado = (values: NovoChamadoValues) => {
    sequencia += 1;
    const novo: Chamado = {
      id: String(sequencia),
      codigoPublico: `CH-2026-${String(90 + sequencia).padStart(4, '0')}`,
      usuarioId: user.id,
      usuarioNome: user.nome,
      grupoEmpresaId: user.grupoEmpresaId,
      grupoEmpresaNome: user.grupoEmpresaNome,
      produto: values.produto,
      categoria: values.categoria,
      descricao: values.descricao,
      status: 'aberto',
      prioridade: 'media',
      slaPrazo: horasNaFrente(24),
      criadoEm: new Date().toISOString(),
      anexos: values.anexos ?? [],
    };
    setChamados((prev) => [novo, ...prev]);
    notify.success(`Chamado ${novo.codigoPublico} aberto com sucesso`);
    closeModal();
  };

  const handleReload = () => notify.success('Fila atualizada');
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
