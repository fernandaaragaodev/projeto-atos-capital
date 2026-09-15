import { useState } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import { esqueciSenha } from '@/api/auth';
import { ApiError } from '@/api/client';

interface EsqueciSenhaValues {
  email: string;
}

const schema: yup.ObjectSchema<EsqueciSenhaValues> = yup.object({
  email: yup.string().email('E-mail inválido').required('Campo obrigatório'),
});

/** Estado e regra de negócio da tela "Esqueci a senha". */
export function useApp() {
  const [enviado, setEnviado] = useState(false);
  const [emailEnviado, setEmailEnviado] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EsqueciSenhaValues>({ resolver: yupResolver(schema) });

  const submit = handleSubmit(async (values) => {
    setErro(null);
    setEnviando(true);
    try {
      await esqueciSenha(values.email);
      setEmailEnviado(values.email);
      setEnviado(true);
    } catch (err) {
      setErro(err instanceof ApiError ? err.message : 'Não foi possível enviar o link. Tente novamente.');
    } finally {
      setEnviando(false);
    }
  });

  return { register, submit, errors, erro, enviando, enviado, emailEnviado };
}
