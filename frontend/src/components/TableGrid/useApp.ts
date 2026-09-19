import { useMemo, useState } from 'react';

export type Order = 'asc' | 'desc';

interface UseTableGridParams<T extends object> {
  rows: T[];
  getRowId: (row: T) => string | number;
  defaultRowsPerPage?: number;
}

/**
 * Estado e regra de negócio do <TableGrid />:
 * paginação, ordenação e seleção.
 *
 * O index.tsx cuida apenas do JSX.
 */
export function useApp<T extends object>({
  rows,
  getRowId,
  defaultRowsPerPage = 10,
}: UseTableGridParams<T>) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(defaultRowsPerPage);

  const [orderBy, setOrderBy] = useState<keyof T & string | null>(
    null,
  );

  const [order, setOrder] = useState<Order>('asc');

  const [selected, setSelected] = useState<
    Array<string | number>
  >([]);

  const handleSort = (field: keyof T & string) => {
    if (orderBy === field) {
      setOrder((prev) =>
        prev === 'asc' ? 'desc' : 'asc',
      );
    } else {
      setOrderBy(field);
      setOrder('asc');
    }
  };

  const sortedRows = useMemo(() => {
    if (!orderBy) {
      return rows;
    }

    const field = orderBy;

    return [...rows].sort((a, b) => {
      const aValue = a[field];
      const bValue = b[field];

      if (aValue === bValue) {
        return 0;
      }

      // Valores nulos/indefinidos ficam no final.
      if (aValue == null) {
        return 1;
      }

      if (bValue == null) {
        return -1;
      }

      let comparison = 0;

      if (
        typeof aValue === 'number' &&
        typeof bValue === 'number'
      ) {
        comparison = aValue - bValue;
      } else {
        comparison = String(aValue).localeCompare(
          String(bValue),
          'pt-BR',
          {
            numeric: true,
            sensitivity: 'base',
          },
        );
      }

      return order === 'asc'
        ? comparison
        : -comparison;
    });
  }, [rows, orderBy, order]);

  const paginatedRows = useMemo(() => {
    const start = page * rowsPerPage;

    return sortedRows.slice(
      start,
      start + rowsPerPage,
    );
  }, [sortedRows, page, rowsPerPage]);

  const toggleSelectAll = (checked: boolean) => {
    setSelected(
      checked
        ? paginatedRows.map(getRowId)
        : [],
    );
  };

  const toggleSelectRow = (id: string | number) => {
    setSelected((prev) =>
      prev.includes(id)
        ? prev.filter((selectedId) => selectedId !== id)
        : [...prev, id],
    );
  };

  const handleChangePage = (
    _: unknown,
    newPage: number,
  ) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (rowsPerPage: number) => {
    setRowsPerPage(rowsPerPage);
    setPage(0);
  };

  return {
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
  };
}