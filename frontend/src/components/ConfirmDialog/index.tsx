import type { ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from '@mui/material';
import type { SvgIconComponent } from '@mui/icons-material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  confirmColor?: 'primary' | 'error' | 'success' | 'warning';
  confirmIcon?: SvgIconComponent;
  loading?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** <ConfirmDialog /> — Confirmação antes de ações destrutivas ou irreversíveis. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  confirmColor = 'primary',
  confirmIcon: ConfirmIcon,
  loading = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>{title}</DialogTitle>
      <DialogContent>
        <Typography variant="body2" component="div">
          {children}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={loading}>
          Cancelar
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          startIcon={ConfirmIcon ? <ConfirmIcon /> : undefined}
          onClick={onConfirm}
          disabled={loading}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
