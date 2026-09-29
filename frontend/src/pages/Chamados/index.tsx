import { Box, Stack, Typography } from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InboxOutlinedIcon from '@mui/icons-material/InboxOutlined';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import ListAltIcon from '@mui/icons-material/ListAlt';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { useNavigate } from 'react-router-dom';
import { Options } from '@/components/Options';
import { ResumeBar } from '@/components/ResumeBar';
import { FilterChips } from '@/components/FilterChips';
import { TableGrid, type TableGridColumn } from '@/components/TableGrid';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/utils/dateConfig';
import { statusLabel, statusToVariant, prioridadeLabel, prioridadeToVariant, type Chamado } from '@/types/chamado';
import { calcularSituacaoSla, formatarTempoRestante } from './slaUtils';
import { useApp } from './useApp';
import { NovoChamadoModal } from './components/NovoChamadoModal';

/** Tela "Fila de Chamados" — núcleo do MVP (Seção 2 do Termo de Referência). */
export function Chamados() {
  const navigate = useNavigate();
  const {
    chamados,
    resumo,
    setSearchTerm,
    activeFilters,
    removeFilter,
    isFilterActive,
    semFiltros,
    applyQuickFilter,
    clearFilters,
    modalOpen,
    openNewModal,
    closeModal,
    createChamado,
    handleReload,
    handleExport,
  } = useApp();

  const columns: Array<TableGridColumn<Chamado>> = [
    { field: 'codigoPublico', headerName: 'Código', sortable: true },
    { field: 'grupoEmpresaNome', headerName: 'Cliente', sortable: true },
    { field: 'produto', headerName: 'Produto', sortable: true },
    { field: 'categoria', headerName: 'Categoria', sortable: true },
    {
      field: 'prioridade',
      headerName: 'Prioridade',
      render: (row) => <StatusBadge label={prioridadeLabel[row.prioridade]} status={prioridadeToVariant[row.prioridade]} />,
    },
    {
      field: 'status',
      headerName: 'Status',
      render: (row) => <StatusBadge label={statusLabel[row.status]} status={statusToVariant[row.status]} />,
    },
    {
      field: 'slaPrazo',
      headerName: 'SLA',
      sortable: true,
      render: (row) => {
        const situacao = calcularSituacaoSla(row);
        const texto = formatarTempoRestante(row);
        if (situacao === 'estourado') {
          return (
            <Stack direction="row" spacing={0.5} alignItems="center" sx={{ color: 'error.main' }}>
              <WarningAmberIcon fontSize="small" />
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {texto}
              </Typography>
            </Stack>
          );
        }
        return (
          <Typography variant="body2" color={situacao === 'proximo' ? 'warning.main' : 'text.secondary'}>
            {texto}
          </Typography>
        );
      },
    },
    { field: 'agenteNome', headerName: 'Agente', render: (row) => row.agenteNome ?? '—' },
    { field: 'criadoEm', headerName: 'Aberto em', sortable: true, render: (row) => formatDate(row.criadoEm) },
  ];

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 3 }}>
        Chamados
      </Typography>

      <ResumeBar
        items={[
          {
            label: 'Em aberto',
            value: resumo.abertos,
            color: 'info',
            icon: InboxOutlinedIcon,
            onClick: () => applyQuickFilter('status-aberto'),
            active: isFilterActive('status-aberto'),
          },
          {
            label: 'Aguardando cliente',
            value: resumo.aguardandoCliente,
            color: 'warning',
            icon: HourglassEmptyIcon,
            onClick: () => applyQuickFilter('status-aguardando-cliente'),
            active: isFilterActive('status-aguardando-cliente'),
          },
          {
            label: 'SLA estourado',
            value: resumo.estourados,
            color: 'error',
            icon: WarningAmberIcon,
            onClick: () => applyQuickFilter('sla-estourado'),
            active: isFilterActive('sla-estourado'),
          },
          {
            label: 'Total histórico',
            value: resumo.total,
            icon: ListAltIcon,
            onClick: clearFilters,
            active: semFiltros,
          },
        ]}
      />

      <Options
        primaryActionLabel="Novo chamado"
        onPrimaryAction={openNewModal}
        onSearch={setSearchTerm}
        onReload={handleReload}
        onExport={handleExport}
      />

      <FilterChips filters={activeFilters} onRemove={removeFilter} />

      <TableGrid
        columns={columns}
        rows={chamados}
        getRowId={(row) => row.id}
        actions={[
          { label: 'Ver detalhes', icon: VisibilityOutlinedIcon, onClick: (row) => navigate(`/chamados/${row.id}`) },
        ]}
      />

      <NovoChamadoModal open={modalOpen} onClose={closeModal} onSubmit={createChamado} />
    </Box>
  );
}
