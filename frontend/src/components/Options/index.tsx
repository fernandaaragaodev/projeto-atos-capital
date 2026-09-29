import { Box, Button, IconButton, InputAdornment, TextField, Tooltip } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from 'react-i18next';
import { useApp, type UseOptionsParams } from './useApp';

const secondaryButtonSx = {
  border: '1px solid',
  borderColor: 'divider',
  borderRadius: 1,
  color: 'text.primary',
  '&:hover': { borderColor: 'primary.main', color: 'primary.main' },
} as const;

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

  // Só aparecem as ações que a tela realmente trata (sem botões "mortos").
  const secondaryActions = [
    { key: 'reload', icon: RefreshIcon, onClick: handleReload, enabled: Boolean(rest.onReload) },
    { key: 'filters', icon: FilterListIcon, onClick: handleToggleFilters, enabled: Boolean(rest.onToggleFilters) },
    { key: 'columns', icon: ViewColumnIcon, onClick: handleToggleColumns, enabled: Boolean(rest.onToggleColumns) },
    { key: 'export', icon: FileDownloadIcon, onClick: handleExport, enabled: Boolean(rest.onExport) },
  ].filter((action) => action.enabled);

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

        {secondaryActions.map(({ key, icon: Icon, onClick }) => (
          <Tooltip key={key} title={t(`table.${key}`) ?? ''}>
            <IconButton onClick={onClick} size="small" aria-label={t(`table.${key}`) ?? key} sx={secondaryButtonSx}>
              <Icon fontSize="small" />
            </IconButton>
          </Tooltip>
        ))}
      </Box>
    </Box>
  );
}
