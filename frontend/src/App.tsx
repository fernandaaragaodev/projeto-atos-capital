import { Navigate, Route, Routes, useNavigate, useLocation } from 'react-router-dom';
import { Tabs, Tab, Box } from '@mui/material';
import { MainLayout } from '@/layouts/MainLayout';
import { AuthProvider, useAuth } from '@/auth/AuthContext';
import { RequireAuth } from '@/auth/RequireAuth';
import { PaginasDisponiveis } from '@/pages/PaginasDisponiveis';
import { TitulosAPagar } from '@/pages/TitulosAPagar';
import { Chamados } from '@/pages/Chamados';
import { ChamadoDetalhe } from '@/pages/ChamadoDetalhe';
import { Relatorios } from '@/pages/Relatorios';

const routes = [
  { path: '/chamados', label: 'Chamados' },
  { path: '/relatorios', label: 'Relatórios de SLA' },
  { path: '/paginas-disponiveis', label: 'Páginas Disponíveis' },
  { path: '/titulos-a-pagar', label: 'Títulos a Pagar' },
];

function AppTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  // Rotas aninhadas (ex.: /chamados/:id) mantêm a aba "pai" destacada.
  const activeTab = routes.find((route) => location.pathname.startsWith(route.path))?.path ?? routes[0].path;

  return (
    <Box sx={{ mb: 3, borderBottom: '1px solid', borderColor: 'divider' }}>
      <Tabs value={activeTab} onChange={(_, value) => navigate(value)} textColor="primary" indicatorColor="primary">
        {routes.map((route) => (
          <Tab key={route.path} value={route.path} label={route.label} />
        ))}
      </Tabs>
    </Box>
  );
}

function AppShell() {
  // RequireAuth só renderiza este componente com o usuário já carregado.
  const { user } = useAuth();

  return (
    <MainLayout userName={user!.nome} companyName={user!.grupoEmpresaNome}>
      <AppTabs />
      <Routes>
        <Route path="/" element={<Navigate to="/chamados" replace />} />
        <Route path="/chamados" element={<Chamados />} />
        <Route path="/chamados/:id" element={<ChamadoDetalhe />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/paginas-disponiveis" element={<PaginasDisponiveis />} />
        <Route path="/titulos-a-pagar" element={<TitulosAPagar />} />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RequireAuth>
        <AppShell />
      </RequireAuth>
    </AuthProvider>
  );
}
