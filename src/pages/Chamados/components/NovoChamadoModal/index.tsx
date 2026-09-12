import { useState, type ChangeEvent } from 'react';
import {
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import { LineErrorForm } from '@/components/LineErrorForm';
import { RequiredLabel } from '@/components/RequiredLabel';
import { useApp, type NovoChamadoValues } from './useApp';

interface NovoChamadoModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (values: NovoChamadoValues) => void;
}

const PRODUTOS = ['Joe SFA B1', 'Portal Atos Capital'];
const CATEGORIAS = ['Integração SAP B1', 'Acesso e login', 'Relatórios', 'Dúvida funcional', 'Outro'];

/** RF01 — Abertura de chamado via portal. RF11 — anexo opcional (print, documentos). */
export function NovoChamadoModal({ open, onClose, onSubmit }: NovoChamadoModalProps) {
  const [arquivos, setArquivos] = useState<string[]>([]);
  const { register, submit, errors } = useApp({
    onSubmit: (values) => {
      onSubmit({
        ...values,
        anexos: arquivos.map((nome, index) => ({ id: `anexo-${index}`, nome, tamanhoKb: 0 })),
      });
      setArquivos([]);
    },
  });

  const handleFilesChange = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;
    setArquivos((prev) => [...prev, ...Array.from(files).map((f) => f.name)]);
    event.target.value = '';
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 16, fontWeight: 600 }}>Novo chamado</DialogTitle>
      <form onSubmit={submit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                size="small"
                label={<RequiredLabel required>Produto / módulo</RequiredLabel>}
                defaultValue=""
                {...register('produto')}
                error={Boolean(errors.produto)}
              >
                {PRODUTOS.map((produto) => (
                  <MenuItem key={produto} value={produto}>
                    {produto}
                  </MenuItem>
                ))}
              </TextField>
              <LineErrorForm message={errors.produto?.message} />
            </Grid>
            <Grid item xs={6}>
              <TextField
                select
                fullWidth
                size="small"
                label={<RequiredLabel required>Categoria do problema</RequiredLabel>}
                defaultValue=""
                {...register('categoria')}
                error={Boolean(errors.categoria)}
              >
                {CATEGORIAS.map((categoria) => (
                  <MenuItem key={categoria} value={categoria}>
                    {categoria}
                  </MenuItem>
                ))}
              </TextField>
              <LineErrorForm message={errors.categoria?.message} />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={4}
                size="small"
                label={<RequiredLabel required>Descrição do problema</RequiredLabel>}
                placeholder="Descreva o que aconteceu, quando começou e como reproduzir o problema."
                {...register('descricao')}
                error={Boolean(errors.descricao)}
              />
              <LineErrorForm message={errors.descricao?.message} />
            </Grid>
            <Grid item xs={12}>
              <Button component="label" size="small" startIcon={<AttachFileIcon />} variant="outlined">
                Anexar arquivo
                <input type="file" hidden multiple onChange={handleFilesChange} />
              </Button>
              {arquivos.length > 0 && (
                <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 1.5 }}>
                  {arquivos.map((nome) => (
                    <Chip
                      key={nome}
                      label={nome}
                      size="small"
                      onDelete={() => setArquivos((prev) => prev.filter((a) => a !== nome))}
                    />
                  ))}
                </Stack>
              )}
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Anexos são opcionais (RF11) e ficam disponíveis para o agente que atender o chamado.
              </Typography>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onClose}>Cancelar</Button>
          <Button type="submit" variant="contained">
            Abrir chamado
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
