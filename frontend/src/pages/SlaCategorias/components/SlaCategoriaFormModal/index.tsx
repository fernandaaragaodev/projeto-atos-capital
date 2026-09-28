import { Controller } from 'react-hook-form';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  InputAdornment,
  MenuItem,
  TextField,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { LineErrorForm } from '@/components/LineErrorForm';
import { RequiredLabel } from '@/components/RequiredLabel';
import type { SlaCategoriaRegra, SlaCategoriaValores } from '@/api/slaCategorias';
import { prioridadeLabel } from '@/types/chamado';
import { PRIORIDADES, useApp } from './useApp';

interface SlaCategoriaFormModalProps {
  open: boolean;
  /** Regra em edição; ausente quando o formulário é de cadastro. */
  regra?: SlaCategoriaRegra;
  onClose: () => void;
  /** Retorna true quando salvou (o modal é fechado por quem chama). */
  onSubmit: (valores: SlaCategoriaValores) => Promise<boolean>;
}

const horasAdornment = { endAdornment: <InputAdornment position="end">horas</InputAdornment> };

/** Cadastro e edição de uma regra de SLA (Produto x Categoria x Prioridade). */
export function SlaCategoriaFormModal({ open, regra, onClose, onSubmit }: SlaCategoriaFormModalProps) {
  const { register, control, submit, errors, isSubmitting } = useApp({ open, regra, onSubmit });
  const editando = Boolean(regra);

  return (
    <Dialog open={open} onClose={isSubmitting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>
        {editando ? 'Editar regra de SLA' : 'Nova regra de SLA'}
      </DialogTitle>
      <form onSubmit={submit} noValidate>
        <DialogContent>
          <Grid container spacing={2}>
            {regra && regra.chamadosVinculados > 0 && (
              <Grid item xs={12}>
                <Alert severity="info">
                  Esta regra já foi usada em {regra.chamadosVinculados} chamado(s). Eles mantêm os prazos calculados
                  na abertura; os novos tempos valem apenas para os próximos chamados.
                </Alert>
              </Grid>
            )}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={<RequiredLabel required>Produto / módulo</RequiredLabel>}
                inputProps={{ maxLength: 100 }}
                {...register('produto')}
                error={Boolean(errors.produto)}
              />
              <LineErrorForm message={errors.produto?.message} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                size="small"
                label={<RequiredLabel required>Categoria</RequiredLabel>}
                inputProps={{ maxLength: 100 }}
                {...register('categoria')}
                error={Boolean(errors.categoria)}
              />
              <LineErrorForm message={errors.categoria?.message} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <Controller
                name="prioridade"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    fullWidth
                    size="small"
                    label={<RequiredLabel required>Prioridade</RequiredLabel>}
                    error={Boolean(errors.prioridade)}
                    {...field}
                  >
                    {PRIORIDADES.map((prioridade) => (
                      <MenuItem key={prioridade} value={prioridade}>
                        {prioridadeLabel[prioridade]}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <LineErrorForm message={errors.prioridade?.message} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label={<RequiredLabel required>Tempo de resposta</RequiredLabel>}
                inputProps={{ min: 1, step: 1 }}
                InputProps={horasAdornment}
                {...register('tempoRespostaHoras', { valueAsNumber: true })}
                error={Boolean(errors.tempoRespostaHoras)}
              />
              <LineErrorForm message={errors.tempoRespostaHoras?.message} />
            </Grid>
            <Grid item xs={12} sm={4}>
              <TextField
                fullWidth
                size="small"
                type="number"
                label={<RequiredLabel required>Tempo de resolução</RequiredLabel>}
                inputProps={{ min: 1, step: 1 }}
                InputProps={horasAdornment}
                {...register('tempoResolucaoHoras', { valueAsNumber: true })}
                error={Boolean(errors.tempoResolucaoHoras)}
              />
              <LineErrorForm message={errors.tempoResolucaoHoras?.message} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" startIcon={<SaveIcon />} disabled={isSubmitting}>
            {editando ? 'Salvar alterações' : 'Cadastrar regra'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
