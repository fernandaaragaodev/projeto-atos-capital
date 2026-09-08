import { useState } from 'react';
import type { SvgIconComponent } from '@mui/icons-material';

export interface MenuItemDef {
  id: string;
  label: string;
  icon: SvgIconComponent;
  external?: boolean;
}

/** Estado e regra de negócio do menu lateral: colapsar/expandir e submenu ativo. */
export function useApp() {
  const [collapsed, setCollapsed] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);

  const toggleCollapsed = () => setCollapsed((prev) => !prev);

  const toggleGroup = (id: string) => {
    setOpenGroup((prev) => (prev === id ? null : id));
  };

  return { collapsed, toggleCollapsed, openGroup, toggleGroup };
}
