import { useState, type MouseEvent } from 'react';
import { Checkbox, FormControlLabel, IconButton, Menu, Tooltip } from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import { useTranslation } from 'react-i18next';
import { useApp, type ColumnDef } from './useApp';

interface ColumnSelectorProps {
  screenId: string;
  columns: ColumnDef[];
  onChange?: (visibleFields: string[]) => void;
}

/** <ColumnSelector /> — Escolha de colunas visíveis, persistida por tela no localStorage. */
export function ColumnSelector({ screenId, columns, onChange }: ColumnSelectorProps) {
  const { t } = useTranslation();
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { visibleFields, toggleColumn, isVisible } = useApp({ screenId, columns });

  const handleOpen = (event: MouseEvent<HTMLElement>) => setAnchorEl(event.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const handleToggle = (field: string) => {
    toggleColumn(field);
    onChange?.(
      visibleFields.includes(field) ? visibleFields.filter((f) => f !== field) : [...visibleFields, field],
    );
  };

  return (
    <>
      <Tooltip title={t('table.columns') ?? ''}>
        <IconButton size="small" onClick={handleOpen}>
          <ViewColumnIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleClose}>
        {columns.map((column) => (
          <FormControlLabel
            key={column.field}
            sx={{ display: 'flex', px: 2, py: 0.25 }}
            control={
              <Checkbox
                size="small"
                checked={isVisible(column.field)}
                onChange={() => handleToggle(column.field)}
              />
            }
            label={column.headerName}
          />
        ))}
      </Menu>
    </>
  );
}
