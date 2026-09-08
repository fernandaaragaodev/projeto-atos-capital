import { FormHelperText } from '@mui/material';

interface LineErrorFormProps {
  message?: string;
}

/**
 * Erro de formulário exibido sob o campo, conforme padrão react-hook-form + Yup
 * do Design System. Renderiza apenas se houver mensagem.
 */
export function LineErrorForm({ message }: LineErrorFormProps) {
  if (!message) return null;
  return (
    <FormHelperText error sx={{ ml: 1.5, fontSize: 11 }}>
      {message}
    </FormHelperText>
  );
}
