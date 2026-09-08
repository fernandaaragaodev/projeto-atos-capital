import { Box, Typography } from '@mui/material';
import { Options } from '@/components/Options';
import { ResumeBar } from '@/components/ResumeBar';
import { FilterChips } from '@/components/FilterChips';
import { TableGrid, type TableGridColumn } from '@/components/TableGrid';
import { StatusBadge } from '@/components/StatusBadge';
import { formatDate } from '@/utils/dateConfig';
import { useApp } from './useApp';
import { TituloFormModal } from './components/TituloFormModal';
import { statusLabel, statusToVariant, type Titulo } from './types';

const currencyFormatter = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

/** Tela "Títulos a Pagar" — demonstra o padrão completo de tela do Design System. */
export function TitulosAPagar() {
  const {
    titulos,
    resumo,
    setSearchTerm,
    activeFilters,
    removeFilter,
    modalOpen,
    openNewModal,
    closeModal,
    createTitulo,
    handleReload,
    handleExport,
  } = useApp();

  const columns: Array<TableGridColumn<Titulo>> = [
    { field: 'fornecedor', headerName: 'Fornecedor', sortable: true },
    { field: 'documento', headerName: 'Documento', sortable: true },
    {
      field: 'vencimento',
      headerName: 'Vencimento',
      sortable: true,
      render: (row) => formatDate(row.vencimento),
    },
    {
      field: 'valor',
      headerName: 'Valor',
      sortable: true,
      render: (row) => currencyFormatter.format(row.valor),
    },
    {
      field: 'status',
      headerName: 'Status',
      render: (row) => <StatusBadge label={statusLabel[row.status]} status={statusToVariant[row.status]} />,
    },
  ];

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 3 }}>
        Títulos a Pagar
      </Typography>

      <ResumeBar
        items={[
          { label: 'Total em aberto', value: currencyFormatter.format(resumo.total) },
          { label: 'Quantidade', value: resumo.quantidade },
          { label: 'Pendentes', value: resumo.pendentes, color: 'warning' },
          { label: 'Atrasados', value: resumo.atrasados, color: 'error' },
        ]}
      />

      <Options
        primaryActionLabel="Novo título"
        onPrimaryAction={openNewModal}
        onSearch={setSearchTerm}
        onReload={handleReload}
        onExport={handleExport}
      />

      <FilterChips filters={activeFilters} onRemove={removeFilter} />

      <TableGrid
        columns={columns}
        rows={titulos}
        getRowId={(row) => row.id}
        actions={[
          { label: 'Ver detalhes', onClick: () => undefined },
          { label: 'Marcar como pago', onClick: () => undefined },
        ]}
      />

      <TituloFormModal open={modalOpen} onClose={closeModal} onSubmit={createTitulo} />
    </Box>
  );
}
