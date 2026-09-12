import { useMemo, useState } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';
import DescriptionIcon from '@mui/icons-material/Description';
import AssignmentIcon from '@mui/icons-material/Assignment';
import ReceiptIcon from '@mui/icons-material/Receipt';
import SettingsIcon from '@mui/icons-material/Settings';
import SecurityIcon from '@mui/icons-material/Security';
import GroupIcon from '@mui/icons-material/Group';
import ApartmentIcon from '@mui/icons-material/Apartment';
import PaymentsIcon from '@mui/icons-material/Payments';

export interface PageLink {
  id: string;
  label: string;
  icon: SvgIconComponent;
}

export interface PageSection {
  id: string;
  title: string;
  subtitle?: string;
  count: number;
  pages: PageLink[];
}

const recentPages: PageLink[] = [
  { id: 'notas-recebidas', label: 'Notas Recebidas', icon: DescriptionIcon },
  { id: 'balancete-mensal', label: 'Balancete Mensal', icon: AssignmentIcon },
  { id: 'titulos-a-pagar', label: 'Títulos a Pagar', icon: ReceiptIcon },
  { id: 'configuracoes', label: 'Configurações', icon: SettingsIcon },
  { id: 'privilegios', label: 'Privilégios', icon: SecurityIcon },
  { id: 'modulos-funcionalidades', label: 'Módulos e Funcionalidades', icon: GroupIcon },
  { id: 'pagamentos', label: 'Pagamentos', icon: PaymentsIcon },
  { id: 'emissao-boleto', label: 'Emissão de Boleto', icon: ReceiptIcon },
];

const sections: PageSection[] = [
  {
    id: 'administrativo',
    title: 'Administrativo',
    subtitle: 'Gestão de Acesso',
    count: 14,
    pages: [
      { id: 'modulos-funcionalidades', label: 'Módulos e Funcionalidades', icon: GroupIcon },
      { id: 'permissoes-usuario', label: 'Permissões de Usuário', icon: SecurityIcon },
      { id: 'privilegios', label: 'Privilégios', icon: SecurityIcon },
      { id: 'usuarios', label: 'Usuários', icon: GroupIcon },
      { id: 'empresas', label: 'Gestão de Empresas', icon: ApartmentIcon },
    ],
  },
];

const totalPages = 76;

/** Estado e regra de negócio da página "Páginas Disponíveis". */
export function useApp() {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredSections = useMemo(() => {
    if (!searchTerm) return sections;
    const term = searchTerm.toLowerCase();
    return sections
      .map((section) => ({
        ...section,
        pages: section.pages.filter((page) => page.label.toLowerCase().includes(term)),
      }))
      .filter((section) => section.pages.length > 0);
  }, [searchTerm]);

  return { searchTerm, setSearchTerm, recentPages, sections: filteredSections, totalPages };
}
