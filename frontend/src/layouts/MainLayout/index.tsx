import type { ReactNode } from 'react';
import {
  Avatar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import MenuOpenIcon from '@mui/icons-material/MenuOpen';
import MenuIcon from '@mui/icons-material/Menu';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import RequestQuoteIcon from '@mui/icons-material/RequestQuote';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import SettingsIcon from '@mui/icons-material/Settings';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import { useTranslation } from 'react-i18next';
import { useThemeMode } from '@/theme/ThemeModeProvider';
import { logos } from '@/theme/tokens';
import { useApp } from './useApp';

const DRAWER_WIDTH = 240;
const DRAWER_WIDTH_COLLAPSED = 72;

interface MainLayoutProps {
  children: ReactNode;
  userName?: string;
  companyName?: string;
}

const menuItems = [
  { id: 'administrativo', icon: AdminPanelSettingsIcon, external: false },
  { id: 'bankServices', icon: AccountBalanceIcon, external: false },
  { id: 'budgetServices', icon: RequestQuoteIcon, external: false },
  { id: 'taxServices', icon: ReceiptLongIcon, external: false },
  { id: 'cardServices', icon: CreditCardIcon, external: true },
] as const;

/** Layout principal: menu lateral com degradê da marca + header superior. */
export function MainLayout({ children, userName = 'Usuário', companyName = 'Atos Capital' }: MainLayoutProps) {
  const { t } = useTranslation();
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const { collapsed, toggleCollapsed } = useApp();
  const width = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH;

  const menuBackground =
    mode === 'light' ? 'linear-gradient(0deg, #7A2828, #893939)' : 'linear-gradient(0deg, #2a0e0e, #3a1818)';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant="permanent"
        sx={{
          width,
          flexShrink: 0,
          transition: 'width 0.2s',
          '& .MuiDrawer-paper': {
            width,
            boxSizing: 'border-box',
            background: menuBackground,
            color: '#ffffff',
            border: 'none',
            transition: 'width 0.2s',
            overflowX: 'hidden',
          },
        }}
      >
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 2 }}>
          {!collapsed && (
            <Box
              component="img"
              src={logos.logo}
              alt="Atos Capital"
              sx={{ height: 24, filter: 'brightness(0) invert(1)' }}
            />
          )}
          <IconButton size="small" onClick={toggleCollapsed} sx={{ color: '#fff' }}>
            {collapsed ? <MenuIcon /> : <MenuOpenIcon />}
          </IconButton>
        </Stack>

        {!collapsed && (
          <Typography
            variant="caption"
            sx={{ px: 2, pb: 1, textTransform: 'uppercase', fontWeight: 700, opacity: 0.7 }}
          >
            {t('menu.servicos')}
          </Typography>
        )}

        <List sx={{ px: 1 }}>
          {menuItems.map(({ id, icon: Icon, external }) => (
            <Tooltip key={id} title={collapsed ? t(`menu.${id}`) ?? '' : ''} placement="right">
              <ListItemButton
                sx={{
                  borderRadius: 1,
                  color: '#fff',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <ListItemIcon sx={{ color: '#fff', minWidth: 36 }}>
                  <Icon fontSize="small" />
                </ListItemIcon>
                {!collapsed && (
                  <>
                    <ListItemText primary={t(`menu.${id}`)} primaryTypographyProps={{ fontSize: 14 }} />
                    {external && <OpenInNewIcon sx={{ fontSize: 14, opacity: 0.8 }} />}
                  </>
                )}
              </ListItemButton>
            </Tooltip>
          ))}
        </List>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="flex-end"
          spacing={1}
          sx={{
            px: 3,
            py: 1.5,
            borderBottom: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper',
          }}
        >
          <Tooltip title={mode === 'light' ? 'Dark mode' : 'Light mode'}>
            <IconButton size="small" onClick={toggleMode}>
              {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <IconButton size="small">
            <HelpOutlineIcon fontSize="small" />
          </IconButton>
          <IconButton size="small">
            <NotificationsNoneIcon fontSize="small" />
          </IconButton>
          <IconButton size="small">
            <SettingsIcon fontSize="small" />
          </IconButton>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ pl: 1 }}>
            <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main', fontSize: 14 }}>
              {userName.charAt(0)}
            </Avatar>
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600, lineHeight: 1.2 }}>
                {userName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {companyName}
              </Typography>
            </Box>
          </Stack>
        </Stack>

        <Box sx={{ flexGrow: 1, p: 3, bgcolor: theme.palette.background.default }}>{children}</Box>
      </Box>
    </Box>
  );
}
