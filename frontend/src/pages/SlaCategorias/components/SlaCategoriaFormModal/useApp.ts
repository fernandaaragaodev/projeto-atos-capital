import { useEffect } from 'react';
import { yupResolver } from '@hookform/resolvers/yup';
import { useForm } from 'react-hook-form';
import * as yup from 'yup';
import type { SlaCategoriaRegra, SlaCategoriaValores } from '@/api/slaCategorias';
import type { Prioridade } from '@/types/chamado';

export const PRIORIDADES: Prioridade[] = ['critica', 'alta', 'media', 'baixa'];

// Mesmos limites validados pelo backend (SlaCategoriasController).
const TAMANHO_MAXIMO_TEXTO = 100;
const TEMPO_MAXIMO_HORAS = 24 * 365;

const tempoEmHoras = yup
  .number()
  .typeError('Informe um número de horas')
  .integer('Use horas inteiras')
  .min(1, 'Mínimo de 1 hora')
  .max(TEMPO_MAXIMO_HORAS, `Máximo de ${TEMPO_MAXIMO_HORAS} horas`)
  .required('Campo obrigatório');

const schema: yup.ObjectSchema<SlaCategoriaValores> = yup.object({
  produto: yup.string().trim().required('Campo obrigatório').max(TAMANHO_MAXIMO_TEXTO, 'Máximo de 100 caracteres'),
  categoria: yup.string().trim().required('Campo obrigatório').max(TAMANHO_MAXIMO_TEXTO, 'Máximo de 100 caracteres'),
  prioridade: yup.mixed<Prioridade>().oneOf(PRIORIDADES, 'Campo obrigatório').required('Campo obrigatório'),
  tempoRespostaHoras: tempoEmHoras,
  tempoResolucaoHoras: tempoEmHoras.test(
    'resolucao-maior-que-resposta',
    'Deve ser maior ou igual ao tempo de resposta',
    (valor, contexto) => valor == null || valor >= (contexto.parent as SlaCategoriaValores).tempoRespostaHoras,
  ),
});

const VALORES_INICIAIS: SlaCategoriaValores = {
  produto: '',
  categoria: '',
  prioridade: 'media',
  tempoRespostaHoras: 4,
  tempoResolucaoHoras: 24,
};

interface UseSlaCategoriaFormParams {
  open: boolean;
  /** Regra em edição; ausente quando o formulário é de cadastro. */
  regra?: SlaCategoriaRegra;
  onSubmit: (valores: SlaCategoriaValores) => Promise<boolean>;
}

/** Estado e validação do formulário de regra de SLA (cadastro e edição). */
export function useApp({ open, regra, onSubmit }: UseSlaCategoriaFormParams) {
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<SlaCategoriaValores>({
    resolver: yupResolver(schema),
    defaultValues: VALORES_INICIAIS,
  });

  // Ao abrir, carrega a regra em edição ou limpa o formulário para um novo cadastro.
  useEffect(() => {
    if (!open) return;
    reset(
      regra
        ? {
            produto: regra.produto,
            categoria: regra.categoria,
            prioridade: regra.prioridade,
            tempoRespostaHoras: regra.tempoRespostaHoras,
            tempoResolucaoHoras: regra.tempoResolucaoHoras,
          }
        : VALORES_INICIAIS,
    );
  }, [open, regra, reset]);

  const submit = handleSubmit(async (valores) => {
    await onSubmit(valores);
  });

  return { register, control, submit, errors, isSubmitting };
}
