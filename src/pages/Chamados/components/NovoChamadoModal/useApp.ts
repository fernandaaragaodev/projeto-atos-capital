import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import type { Anexo } from '@/types/chamado';

export interface NovoChamadoValues {
  produto: string;
  categoria: string;
  descricao: string;
  anexos?: Anexo[];
}

const schema: yup.ObjectSchema<Omit<NovoChamadoValues, 'anexos'>> = yup.object({
  produto: yup.string().required('Campo obrigatório'),
  categoria: yup.string().required('Campo obrigatório'),
  descricao: yup.string().required('Campo obrigatório').min(10, 'Descreva o problema com mais detalhes'),
});

interface UseNovoChamadoParams {
  onSubmit: (values: NovoChamadoValues) => void;
}

/** RF01 — Estado e validação do formulário de abertura de chamado. */
export function useApp({ onSubmit }: UseNovoChamadoParams) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<Omit<NovoChamadoValues, 'anexos'>>({
    resolver: yupResolver(schema),
    defaultValues: { produto: '', categoria: '', descricao: '' },
  });

  const submit = handleSubmit((values) => {
    onSubmit({ ...values, anexos: [] });
    reset();
  });

  return { register, submit, errors, reset };
}
