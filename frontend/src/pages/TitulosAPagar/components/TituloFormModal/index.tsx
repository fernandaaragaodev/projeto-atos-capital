import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, TextField } from '@mui/material';
import { LineErrorForm } from '@/components/LineErrorForm';
import { RequiredLabel } from '@/components/RequiredLabel';
import { useApp, type TituloFormValues } from './useApp';

interface TituloFormModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: TituloFormValues) => void;
}

/** Modal de cadastro de título — corpo em duas partes: index.tsx (JSX) + useApp.ts (regra de negócio). */
export function TituloFormModal({ open, onClose, onSubmit }: TituloFormModalProps) {
  const { register, submit, errors } = useApp({ onSubmit });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>Novo título a pagar</DialogTitle>
      <form onSubmit={submit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                size="small"
                label={<RequiredLabel required>Fornecedor</RequiredLabel>}
                {...register('fornecedor')}
                error={Boolean(errors.fornecedor)}
              />
              <LineErrorForm message={errors.fornecedor?.message} />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                label={<RequiredLabel required>Documento</RequiredLabel>}
                {...register('documento')}
                error={Boolean(errors.documento)}
              />
              <LineErrorForm message={errors.documento?.message} />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="date"
                label={<RequiredLabel required>Vencimento</RequiredLabel>}
                InputLabelProps={{ shrink: true }}
                {...register('vencimento')}
                error={Boolean(errors.vencimento)}
              />
              <LineErrorForm message={errors.vencimento?.message} />
            </Grid>
            <Grid item xs={6}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label={<RequiredLabel required>Valor</RequiredLabel>}
                {...register('valor')}
                error={Boolean(errors.valor)}
              />
              <LineErrorForm message={errors.valor?.message} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained">
            Salvar
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
