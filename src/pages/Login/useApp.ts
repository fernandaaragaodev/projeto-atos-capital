import { useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/auth/AuthContext';

interface LoginValues {
  email: string;
  senha: string;
}

const schema: yup.ObjectSchema<LoginValues> = yup.object({
  email: yup.string().email('E-mail inválido').required('Campo obrigatório'),
  senha: yup.string().required('Campo obrigatório'),
});

interface LocationState {
  from?: { pathname: string };
}

export function useApp() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: yupResolver(schema) });

  const submit = handleSubmit(async (values) => {
    setErro(null);
    setEnviando(true);
    try {
      await login(values.email, values.senha);
      const destino = (location.state as LocationState | null)?.from?.pathname ?? '/chamados';
      navigate(destino, { replace: true });
    } catch {
      setErro('E-mail ou senha inválidos');
    } finally {
      setEnviando(false);
    }
  });

  return { register, submit, errors, erro, enviando };
}
