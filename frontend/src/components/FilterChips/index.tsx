import { Box, Chip } from '@mui/material';

export interface ActiveFilter {
  id: string;
  label: string;
}

interface FilterChipsProps {
  filters: ActiveFilter[];
  onRemove: (id: string) => void;
}

/** Chips de filtro ativos, alinhados à direita, cada um removível. */
export function FilterChips({ filters, onRemove }: FilterChipsProps) {
  if (filters.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, flexWrap: 'wrap', mb: 2 }}>
      {filters.map((filter) => (
        <Chip key={filter.id} label={filter.label} onDelete={() => onRemove(filter.id)} size="small" />
      ))}
    </Box>
  );
}
