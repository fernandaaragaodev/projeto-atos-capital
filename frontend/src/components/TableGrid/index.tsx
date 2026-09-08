import type { ReactNode } from 'react';
import {
  Box,
  Checkbox,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  Typography,
} from '@mui/material';
import { useState, type MouseEvent } from 'react';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useTranslation } from 'react-i18next';
import { useApp } from './useApp';

export interface TableGridColumn<T> {
  field: string;
  headerName: string;
  sortable?: boolean;
  render?: (row: T) => ReactNode;
}

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
}

interface TableGridProps<T extends Record<string, unknown>> {
  columns: Array<TableGridColumn<T>>;
  rows: T[];
  getRowId: (row: T) => string | number;
  selectable?: boolean;
  actions?: Array<RowAction<T>>;
}

/** <TableGrid /> — Tabela com paginação, ordenação, seleção opcional e coluna de Ações no fim. */
export function TableGrid<T extends Record<string, unknown>>({
  columns,
  rows,
  getRowId,
  selectable = false,
  actions,
}: TableGridProps<T>) {
  const { t } = useTranslation();
  const {
    page,
    rowsPerPage,
    orderBy,
    order,
    selected,
    paginatedRows,
    handleSort,
    toggleSelectAll,
    toggleSelectRow,
    handleChangePage,
    handleChangeRowsPerPage,
  } = useApp<T>({ rows, getRowId });

  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [activeRow, setActiveRow] = useState<T | null>(null);

  const openActionsMenu = (event: MouseEvent<HTMLElement>, row: T) => {
    setMenuAnchor(event.currentTarget);
    setActiveRow(row);
  };
  const closeActionsMenu = () => {
    setMenuAnchor(null);
    setActiveRow(null);
  };

  const allSelected = paginatedRows.length > 0 && selected.length === paginatedRows.length;

  return (
    <Box>
      <TableContainer sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              {selectable && (
                <TableCell padding="checkbox">
                  <Checkbox
                    indeterminate={selected.length > 0 && !allSelected}
                    checked={allSelected}
                    onChange={(e) => toggleSelectAll(e.target.checked)}
                  />
                </TableCell>
              )}
              {columns.map((column) => (
                <TableCell key={column.field}>
                  {column.sortable ? (
                    <TableSortLabel
                      active={orderBy === column.field}
                      direction={orderBy === column.field ? order : 'asc'}
                      onClick={() => handleSort(column.field)}
                    >
                      {column.headerName}
                    </TableSortLabel>
                  ) : (
                    column.headerName
                  )}
                </TableCell>
              ))}
              {actions && actions.length > 0 && <TableCell align="right">{t('table.actions')}</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length + (selectable ? 1 : 0) + (actions ? 1 : 0)}>
                  <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 3 }}>
                    {t('table.noData')}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
            {paginatedRows.map((row) => {
              const id = getRowId(row);
              return (
                <TableRow key={id} hover selected={selected.includes(id)}>
                  {selectable && (
                    <TableCell padding="checkbox">
                      <Checkbox checked={selected.includes(id)} onChange={() => toggleSelectRow(id)} />
                    </TableCell>
                  )}
                  {columns.map((column) => (
                    <TableCell key={column.field}>
                      {column.render ? column.render(row) : (row[column.field] as ReactNode)}
                    </TableCell>
                  ))}
                  {actions && actions.length > 0 && (
                    <TableCell align="right">
                      <IconButton size="small" onClick={(e) => openActionsMenu(e, row)}>
                        <MoreVertIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>

      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        onPageChange={handleChangePage}
        rowsPerPage={rowsPerPage}
        onRowsPerPageChange={(e) => handleChangeRowsPerPage(Number(e.target.value))}
        labelRowsPerPage={t('table.rowsPerPage')}
      />

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeActionsMenu}>
        {actions?.map((action) => (
          <MenuItem
            key={action.label}
            onClick={() => {
              if (activeRow) action.onClick(activeRow);
              closeActionsMenu();
            }}
          >
            {action.label}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}
