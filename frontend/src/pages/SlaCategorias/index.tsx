import { Box, Typography } from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RuleIcon from '@mui/icons-material/Rule';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined';
import { Options } from '@/components/Options';
import { ResumeBar } from '@/components/ResumeBar';
import { TableGrid, type TableGridColumn } from '@/components/TableGrid';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { RoleGuard } from '@/auth/RoleGuard';
import type { SlaCategoriaRegra } from '@/api/slaCategorias';
import { prioridadeLabel, prioridadeToVariant } from '@/types/chamado';
import { SlaCategoriaFormModal } from './components/SlaCategoriaFormModal';
import { useApp } from './useApp';

const formatarHoras = (horas: number) => `${horas} h`;

/** Manutenção das regras de SLA por produto, categoria e prioridade. Acesso restrito (RF12). */
function SlaCategoriasContent() {
  const {
    regras,
    resumo,
    setSearchTerm,
    formOpen,
    regraEmEdicao,
    openNewModal,
    openEditModal,
    closeForm,
    salvar,
    regraParaExcluir,
    excluindo,
    pedirExclusao,
    cancelarExclusao,
    confirmarExclusao,
    handleReload,
  } = useApp();

  const columns: Array<TableGridColumn<SlaCategoriaRegra>> = [
    { field: 'produto', headerName: 'Produto', sortable: true },
    { field: 'categoria', headerName: 'Categoria', sortable: true },
    {
      field: 'prioridade',
      headerName: 'Prioridade',
      render: (row) => <StatusBadge label={prioridadeLabel[row.prioridade]} status={prioridadeToVariant[row.prioridade]} />,
    },
    {
      field: 'tempoRespostaHoras',
      headerName: 'Tempo de resposta',
      sortable: true,
      render: (row) => formatarHoras(row.tempoRespostaHoras),
    },
    {
      field: 'tempoResolucaoHoras',
      headerName: 'Tempo de resolução',
      sortable: true,
      render: (row) => formatarHoras(row.tempoResolucaoHoras),
    },
    { field: 'chamadosVinculados', headerName: 'Chamados vinculados', sortable: true },
  ];

  return (
    <Box>
      <Typography variant="h1" sx={{ mb: 3 }}>
        Categorias de SLA
      </Typography>

      <ResumeBar
        items={[
          { label: 'Regras cadastradas', value: resumo.regras, icon: RuleIcon },
          { label: 'Produtos', value: resumo.produtos, icon: Inventory2OutlinedIcon, color: 'info' },
          { label: 'Categorias', value: resumo.categorias, icon: CategoryOutlinedIcon, color: 'success' },
        ]}
      />

      <Options
        primaryActionLabel="Nova regra de SLA"
        onPrimaryAction={openNewModal}
        onSearch={setSearchTerm}
        onReload={handleReload}
      />

      <TableGrid
        columns={columns}
        rows={regras}
        getRowId={(row) => row.id}
        actions={[
          { label: 'Editar', icon: EditIcon, onClick: openEditModal },
          { label: 'Excluir', icon: DeleteOutlineIcon, color: 'error', onClick: pedirExclusao },
        ]}
      />

      <SlaCategoriaFormModal open={formOpen} regra={regraEmEdicao} onClose={closeForm} onSubmit={salvar} />

      <ConfirmDialog
        open={Boolean(regraParaExcluir)}
        title="Excluir regra de SLA"
        confirmLabel="Excluir"
        confirmColor="error"
        confirmIcon={DeleteOutlineIcon}
        loading={excluindo}
        onConfirm={confirmarExclusao}
        onClose={cancelarExclusao}
      >
        {regraParaExcluir && (
          <>
            Excluir a regra <strong>{regraParaExcluir.produto}</strong> · <strong>{regraParaExcluir.categoria}</strong> ·{' '}
            <strong>{prioridadeLabel[regraParaExcluir.prioridade]}</strong>? Esta ação não poderá ser desfeita.
            {regraParaExcluir.chamadosVinculados > 0 && (
              <Box component="span" sx={{ display: 'block', mt: 1, color: 'warning.main' }}>
                Há {regraParaExcluir.chamadosVinculados} chamado(s) vinculado(s) a esta regra; o sistema não permite
                excluir regras em uso.
              </Box>
            )}
          </>
        )}
      </ConfirmDialog>
    </Box>
  );
}

export function SlaCategorias() {
  return (
    <RoleGuard allow={['supervisor', 'admin']}>
      <SlaCategoriasContent />
    </RoleGuard>
  );
}
