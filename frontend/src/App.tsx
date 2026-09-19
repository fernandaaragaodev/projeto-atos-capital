import { Navigate, Route, Routes } from 'react-router-dom';

import { RequireAuth } from '@/auth/RequireAuth';
import { useAuth } from '@/auth/AuthContext';

import { MainLayout } from '@/layouts/MainLayout';

import { Dashboard } from '@/pages/Dashboard';
import { Chamados } from '@/pages/Chamados';
import { ChamadoDetalhe } from '@/pages/ChamadoDetalhe';
import { Relatorios } from '@/pages/Relatorios';
import { PaginasDisponiveis } from '@/pages/PaginasDisponiveis';
import { TitulosAPagar } from '@/pages/TitulosAPagar';

/**
 * Telas principais do sistema.
 *
 * O Dashboard é o ponto central de navegação.
 */
function AppShell() {
  const { user } = useAuth();

  return (
    <MainLayout
      userName={user?.nome ?? 'Usuário'}
      companyName={user?.grupoEmpresaNome ?? 'Atos Capital'}
    >
      <Routes>
        <Route path="/" element={<Dashboard />} />

        <Route
          path="/chamados"
          element={<Chamados />}
        />

        <Route
          path="/chamados/:id"
          element={<ChamadoDetalhe />}
        />

        <Route
          path="/relatorios"
          element={<Relatorios />}
        />

        <Route
          path="/paginas-disponiveis"
          element={<PaginasDisponiveis />}
        />

        <Route
          path="/titulos-a-pagar"
          element={<TitulosAPagar />}
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </MainLayout>
  );
}

export default function App() {
  return (
    <RequireAuth>
      <AppShell />
    </RequireAuth>
  );
}