import { useEffect, useState } from 'react';

export interface ColumnDef {
  field: string;
  headerName: string;
}

interface UseColumnSelectorParams {
  screenId: string;
  columns: ColumnDef[];
}

const storageKey = (screenId: string) => `atos:columns:${screenId}`;

/**
 * Estado do <ColumnSelector />.
 * Persiste as colunas visíveis por tela no localStorage, como pede o Design System.
 */
export function useApp({ screenId, columns }: UseColumnSelectorParams) {
  const [visibleFields, setVisibleFields] = useState<string[]>(() => {
    const stored = localStorage.getItem(storageKey(screenId));
    if (stored) {
      try {
        return JSON.parse(stored) as string[];
      } catch {
        // ignora JSON inválido e cai no default
      }
    }
    return columns.map((c) => c.field);
  });

  useEffect(() => {
    localStorage.setItem(storageKey(screenId), JSON.stringify(visibleFields));
  }, [screenId, visibleFields]);

  const toggleColumn = (field: string) => {
    setVisibleFields((prev) =>
      prev.includes(field) ? prev.filter((f) => f !== field) : [...prev, field],
    );
  };

  const isVisible = (field: string) => visibleFields.includes(field);

  return { visibleFields, toggleColumn, isVisible };
}
