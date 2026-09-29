import { useCallback, useEffect, useMemo, useState } from 'react';
import { notify } from '@/utils/notify';
import { ApiError } from '@/api/client';
import {
  criar,
  editar,
  excluir,
  listarRegras,
  type SlaCategoriaRegra,
  type SlaCategoriaValores,
} from '@/api/slaCategorias';
import { prioridadeLabel } from '@/types/chamado';

/** O client já mostra toast para 403/409; aqui cobrimos os demais erros sem duplicar o aviso. */
function notificarErro(err: unknown, fallback: string) {
  if (err instanceof ApiError && (err.status === 403 || err.status === 409)) return;
  notify.error(err instanceof ApiError ? err.message : fallback);
}

/** Manutenção das regras de SLA: listagem, cadastro, edição e exclusão. */
export function useApp() {
  const [regras, setRegras] = useState<SlaCategoriaRegra[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [regraEmEdicao, setRegraEmEdicao] = useState<SlaCategoriaRegra | undefined>();
  const [regraParaExcluir, setRegraParaExcluir] = useState<SlaCategoriaRegra | undefined>();
  const [excluindo, setExcluindo] = useState(false);

  const carregarRegras = useCallback(async () => {
    try {
      setRegras(await listarRegras());
      return true;
    } catch (err) {
      notificarErro(err, 'Não foi possível carregar as regras de SLA.');
      return false;
    }
  }, []);

  useEffect(() => {
    carregarRegras();
  }, [carregarRegras]);

  const regrasFiltradas = useMemo(() => {
    const termo = searchTerm.trim().toLowerCase();
    if (!termo) return regras;
    return regras.filter(
      (r) =>
        r.produto.toLowerCase().includes(termo) ||
        r.categoria.toLowerCase().includes(termo) ||
        prioridadeLabel[r.prioridade].toLowerCase().includes(termo),
    );
  }, [regras, searchTerm]);

  const resumo = useMemo(
    () => ({
      regras: regras.length,
      produtos: new Set(regras.map((r) => r.produto)).size,
      categorias: new Set(regras.map((r) => `${r.produto}|${r.categoria}`)).size,
    }),
    [regras],
  );

  const openNewModal = () => {
    setRegraEmEdicao(undefined);
    setFormOpen(true);
  };
  const openEditModal = (regra: SlaCategoriaRegra) => {
    setRegraEmEdicao(regra);
    setFormOpen(true);
  };
  const closeForm = () => setFormOpen(false);

  const salvar = async (valores: SlaCategoriaValores): Promise<boolean> => {
    try {
      if (regraEmEdicao) {
        await editar(regraEmEdicao.id, valores);
        notify.success('Regra de SLA atualizada');
      } else {
        await criar(valores);
        notify.success('Regra de SLA cadastrada');
      }
      closeForm();
      await carregarRegras();
      return true;
    } catch (err) {
      notificarErro(err, 'Não foi possível salvar a regra de SLA.');
      return false;
    }
  };

  const pedirExclusao = (regra: SlaCategoriaRegra) => setRegraParaExcluir(regra);
  const cancelarExclusao = () => setRegraParaExcluir(undefined);

  const confirmarExclusao = async () => {
    if (!regraParaExcluir) return;
    setExcluindo(true);
    try {
      await excluir(regraParaExcluir.id);
      notify.success('Regra de SLA excluída');
      setRegraParaExcluir(undefined);
      await carregarRegras();
    } catch (err) {
      notificarErro(err, 'Não foi possível excluir a regra de SLA.');
    } finally {
      setExcluindo(false);
    }
  };

  const handleReload = async () => {
    if (await carregarRegras()) notify.success('Regras de SLA atualizadas');
  };

  return {
    regras: regrasFiltradas,
    resumo,
    setSearchTerm,
    formOpen,
    regraEmEdicao,
    openNewModal,
    openEditModal,
    closeForm,
    salvar,
    regraParaExcluir,
    excluindo,
    pedirExclusao,
    cancelarExclusao,
    confirmarExclusao,
    handleReload,
  };
}
