import type { StatusVariant } from '@/components/StatusBadge';

export interface Titulo {
  id: string;
  fornecedor: string;
  documento: string;
  vencimento: string; // ISO
  valor: number;
  status: 'pago' | 'pendente' | 'atrasado';
}

export const statusToVariant: Record<Titulo['status'], StatusVariant> = {
  pago: 'success',
  pendente: 'warning',
  atrasado: 'error',
};

export const statusLabel: Record<Titulo['status'], string> = {
  pago: 'Pago',
  pendente: 'Pendente',
  atrasado: 'Atrasado',
};
