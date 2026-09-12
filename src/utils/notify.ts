import { toast } from 'sonner';

/**
 * Camada única de notificações do app.
 * Regra do Design System: usar sempre `sonner`, nunca o Snackbar do MUI.
 */
export const notify = {
  success: (message: string) => toast.success(message),
  error: (message: string) => toast.error(message),
  warning: (message: string) => toast.warning(message),
};
