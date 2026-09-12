import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';

export interface TituloFormValues {
  fornecedor: string;
  documento: string;
  vencimento: string;
  valor: number;
}

const schema: yup.ObjectSchema<TituloFormValues> = yup.object({
  fornecedor: yup.string().required('Campo obrigatório'),
  documento: yup.string().required('Campo obrigatório'),
  vencimento: yup.string().required('Campo obrigatório'),
  valor: yup
    .number()
    .typeError('Informe um valor numérico')
    .positive('O valor deve ser maior que zero')
    .required('Campo obrigatório'),
});

interface UseTituloFormParams {
  onSubmit: (values: TituloFormValues) => void;
}

/** Estado e regra de negócio do formulário de novo título — validação via Yup. */
export function useApp({ onSubmit }: UseTituloFormParams) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<TituloFormValues>({
    resolver: yupResolver(schema),
    defaultValues: { fornecedor: '', documento: '', vencimento: '', valor: 0 },
  });

  const submit = handleSubmit((values) => {
    onSubmit(values);
    reset();
  });

  return { register, submit, errors, reset };
}
