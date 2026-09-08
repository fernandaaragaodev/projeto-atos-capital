import { Box, Button, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { useApp, type UseOptionsParams } from './useApp';

interface OptionsProps extends UseOptionsParams {
  primaryActionLabel?: string;
  onPrimaryAction?: () => void;
}

/**
 * <Options /> — Barra de ações do padrão de tela.
 * Botão primário à esquerda; busca rápida e ações secundárias à direita
 * (recarregar, filtro, colunas, exportar).
 */
export function Options({ primaryActionLabel, onPrimaryAction, ...rest }: OptionsProps) {
  const { t } = useTranslation();
  const { searchTerm, handleSearchChange, handleReload, handleToggleFilters, handleToggleColumns, handleExport } =
    useApp(rest);

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 2,
        flexWrap: 'wrap',
        mb: 2,
      }}
    >
      {primaryActionLabel && (
        <Button variant="contained" color="primary" startIcon={<AddIcon />} onClick={onPrimaryAction}>
          {primaryActionLabel}
        </Button>
      )}

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, ml: 'auto' }}>
        <TextField
          size="small"
          placeholder={t('portal.searchPlaceholder') ?? ''}
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 240 }}
        />

        <Tooltip title={t('table.reload') ?? ''}>
          <IconButton onClick={handleReload} size="small">
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('table.filters') ?? ''}>
          <IconButton onClick={handleToggleFilters} size="small">
            <FilterListIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('table.columns') ?? ''}>
          <IconButton onClick={handleToggleColumns} size="small">
            <ViewColumnIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={t('table.export') ?? ''}>
          <IconButton onClick={handleExport} size="small">
            <FileDownloadIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
