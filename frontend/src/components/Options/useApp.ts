import { useState, type ChangeEvent } from 'react';

export interface UseOptionsParams {
  onSearch?: (term: string) => void;
  onReload?: () => void;
  onToggleFilters?: () => void;
  onToggleColumns?: () => void;
  onExport?: () => void;
}

/**
 * Estado e regra de negócio da barra de ações <Options />.
 * O index.tsx cuida apenas do JSX.
 */
export function useApp({ onSearch, onReload, onToggleFilters, onToggleColumns, onExport }: UseOptionsParams) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearchChange = (event: ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value;
    setSearchTerm(value);
    onSearch?.(value);
  };

  return {
    searchTerm,
    handleSearchChange,
    handleReload: () => onReload?.(),
    handleToggleFilters: () => onToggleFilters?.(),
    handleToggleColumns: () => onToggleColumns?.(),
    handleExport: () => onExport?.(),
  };
}
