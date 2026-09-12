import { useState } from 'react';
import { Box, Button, Stack, TextField, ToggleButton, ToggleButtonGroup } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';

interface NovaInteracaoFormProps {
  onSubmit: (mensagem: string, tipo: 'publica' | 'nota_interna') => void;
}

/** RF05 — alterna entre responder publicamente ao cliente ou registrar nota interna. */
export function NovaInteracaoForm({ onSubmit }: NovaInteracaoFormProps) {
  const [tipo, setTipo] = useState<'publica' | 'nota_interna'>('publica');
  const [mensagem, setMensagem] = useState('');

  const handleSubmit = () => {
    if (!mensagem.trim()) return;
    onSubmit(mensagem.trim(), tipo);
    setMensagem('');
  };

  return (
    <Box>
      <ToggleButtonGroup
        size="small"
        exclusive
        value={tipo}
        onChange={(_, value) => value && setTipo(value)}
        sx={{ mb: 1.5 }}
      >
        <ToggleButton value="publica">Responder ao cliente</ToggleButton>
        <ToggleButton value="nota_interna">Nota interna</ToggleButton>
      </ToggleButtonGroup>

      <TextField
        fullWidth
        multiline
        minRows={3}
        size="small"
        placeholder={
          tipo === 'publica' ? 'Escreva a resposta que o cliente vai ver...' : 'Anotação visível só para a equipe...'
        }
        value={mensagem}
        onChange={(e) => setMensagem(e.target.value)}
      />

      <Stack direction="row" justifyContent="flex-end" sx={{ mt: 1.5 }}>
        <Button variant="contained" size="small" startIcon={<SendIcon />} onClick={handleSubmit}>
          {tipo === 'publica' ? 'Enviar resposta' : 'Salvar nota'}
        </Button>
      </Stack>
    </Box>
  );
}
