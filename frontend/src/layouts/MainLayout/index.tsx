import type { ReactNode } from 'react';
import { useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Breadcrumbs,
  Button,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Stack,
  Tooltip,
  Typography,
  useTheme,
} from '@mui/material';
import DashboardRoundedIcon from '@mui/icons-material/DashboardRounded';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone';
import LogoutIcon from '@mui/icons-material/Logout';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import HomeRoundedIcon from '@mui/icons-material/HomeRounded';
import { useLocation, useNavigate } from 'react-router-dom';
import { useThemeMode } from '@/theme/ThemeModeProvider';
import { logos } from '@/theme/tokens';

interface MainLayoutProps {
  children: ReactNode;
  userName?: string;
  companyName?: string;
  onLogout?: () => void;
}

const routeLabels: Record<string, string> = {
  '/chamados': 'Chamados',
  '/relatorios': 'Relatórios de SLA',
};

function getPageLabel(pathname: string) {
  const base = Object.keys(routeLabels).find((path) => pathname.startsWith(path));
  return base ? routeLabels[base] : 'Dashboard';
}

export function MainLayout({
  children,
  userName = 'Usuário',
  companyName = 'Atos Capital',
  onLogout,
}: MainLayoutProps) {
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);
  const isDashboard = location.pathname === '/';
  const pageLabel = getPageLabel(location.pathname);

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <Stack
        component="header"
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          px: { xs: 2, md: 3 },
          py: 1.25,
          minHeight: 64,
          borderBottom: '1px solid',
          borderColor: 'divider',
          bgcolor: 'background.paper',
          position: 'sticky',
          top: 0,
          zIndex: theme.zIndex.appBar,
          backdropFilter: 'blur(12px)',
        }}
      >
        <Button
          onClick={() => navigate('/')}
          sx={{ minWidth: 0, p: 0.5, borderRadius: 2, '&:hover': { bgcolor: 'action.hover' } }}
          aria-label="Ir para o Dashboard"
        >
          <Box component="img" src={logos.logo} alt="Atos Capital" sx={{ height: 28, width: 112, objectFit: 'contain' }} />
        </Button>

        <Stack direction="row" alignItems="center" spacing={{ xs: 0.25, md: 0.75 }}>
          {!isDashboard && (
            <Tooltip title="Voltar para o Dashboard">
              <Button
                size="small"
                startIcon={<DashboardRoundedIcon fontSize="small" />}
                onClick={() => navigate('/')}
                sx={{
                  display: { xs: 'none', sm: 'inline-flex' },
                  mr: 0.5,
                  fontWeight: 600,
                  borderRadius: 2,
                }}
              >
                Dashboard
              </Button>
            </Tooltip>
          )}

          <Tooltip title={mode === 'light' ? 'Ativar modo escuro' : 'Ativar modo claro'}>
            <IconButton size="small" onClick={toggleMode}>
              {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
          <Tooltip title="Ajuda">
            <IconButton size="small">
              <HelpOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Notificações">
            <IconButton size="small" onClick={(event) => setNotificationAnchor(event.currentTarget)}>
              <Badge color="primary" variant="dot">
                <NotificationsNoneIcon fontSize="small" />
              </Badge>
            </IconButton>
          </Tooltip>

          <Menu
            anchorEl={notificationAnchor}
            open={Boolean(notificationAnchor)}
            onClose={() => setNotificationAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            transformOrigin={{ vertical: 'top', horizontal: 'right' }}
          >
            <MenuItem disabled sx={{ fontWeight: 700 }}>
              Notificações
            </MenuItem>
            <Divider />
            <MenuItem onClick={() => { setNotificationAnchor(null); navigate('/chamados/2'); }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>SLA estourado</Typography>
                <Typography variant="caption" color="text.secondary">CH-2026-0092 requer atenção.</Typography>
              </Box>
            </MenuItem>
            <MenuItem onClick={() => { setNotificationAnchor(null); navigate('/chamados'); }}>
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>3 chamados ativos</Typography>
                <Typography variant="caption" color="text.secondary">Acompanhe a fila de atendimento.</Typography>
              </Box>
            </MenuItem>
          </Menu>

          <Stack direction="row" alignItems="center" spacing={1} sx={{ pl: { xs: 0.5, md: 1 } }}>
            <Avatar sx={{ width: 34, height: 34, bgcolor: 'primary.main', fontSize: 14 }}>
              {userName.charAt(0).toUpperCase()}
            </Avatar>
            <Box sx={{ display: { xs: 'none', md: 'block' } }}>
              <Typography variant="body2" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                {userName}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {companyName}
              </Typography>
            </Box>
          </Stack>

          {onLogout && (
            <Tooltip title="Sair">
              <IconButton size="small" onClick={onLogout} sx={{ ml: 0.5 }}>
                <LogoutIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Stack>
      </Stack>

      <Box sx={{ px: { xs: 2, md: 3 }, pt: 1.5, bgcolor: 'background.default' }}>
        <Breadcrumbs
          separator={<ChevronRightIcon sx={{ fontSize: 16 }} />}
          aria-label="navegação estrutural"
          sx={{ '& .MuiBreadcrumbs-ol': { alignItems: 'center' } }}
        >
          <Button
            size="small"
            startIcon={<HomeRoundedIcon sx={{ fontSize: 16 }} />}
            onClick={() => navigate('/')}
            sx={{ minWidth: 0, px: 0.5, fontSize: 12, color: isDashboard ? 'text.primary' : 'text.secondary' }}
          >
            Dashboard
          </Button>
          {!isDashboard && (
            <Typography variant="caption" color="text.primary" sx={{ fontWeight: 600 }}>
              {pageLabel}
            </Typography>
          )}
        </Breadcrumbs>
      </Box>

      <Box sx={{ p: { xs: 2, md: 3 }, pt: { xs: 1.5, md: 2 } }}>{children}</Box>
    </Box>
  );
}
