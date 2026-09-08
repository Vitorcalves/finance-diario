import {useCallback, useEffect, useMemo, useState} from 'react';
import dayjs from 'dayjs';
import {v4 as uuid4} from 'uuid';
import {
  deleteItensTransacaoByTransacao,
  insertItemTransacao,
  type ItemTransacao,
  listItensTransacao,
} from '../../models/itensTransacao';
import {deleteTransacaoById, insertTransacao, listTransacoes, type Transacoes,} from '../../models/transacoesModel';
import {registrarPrecoVariante} from '../../models/produtoVariantes';
import {type Empresa, listEmpresas} from '../../models/empresas';
import type {NovoLancamento} from './types';

/** Data com hora local, para o historico de precos ser exibido no dia correto. */
const toDataHistorico = (data: string): string => dayjs(data).format('YYYY-MM-DDTHH:mm:ss');

export type UseHome = {
  loading: boolean;
  transacoes: Transacoes[];
  /** Total das saidas (valor negativo somado). */
  totalSaidas: number;
  /** Entradas menos saidas. */
  saldoAtual: number;
  /** Pares `[data, total]` do mais recente para o mais antigo. */
  totaisPorDia: [string, number][];
  itensPorTransacao: Map<string, ItemTransacao[]>;
  nomeEmpresa: (id?: string | null) => string;
  adicionarLancamento: (lancamento: NovoLancamento) => Promise<void>;
  removerTransacao: (id: string) => void;
};

/**
 * Concentra o acesso ao banco e os calculos da Home, deixando a tela
 * responsavel apenas pela montagem dos blocos visuais.
 */
export function useHome(): UseHome {
  const [transacoes, setTransacoes] = useState<Transacoes[]>([]);
  const [itens, setItens] = useState<ItemTransacao[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarDados = useCallback(async (): Promise<void> => {
    const [transacoesDoBanco, itensDoBanco, empresasDoBanco] = await Promise.all([
      listTransacoes(),
      listItensTransacao(),
      listEmpresas(),
    ]);

    setTransacoes(transacoesDoBanco);
    setItens(itensDoBanco);
    setEmpresas(empresasDoBanco);
  }, []);

  useEffect(() => {
    let mounted = true;

    const bootstrap = async (): Promise<void> => {
      try {
        await carregarDados();
      } catch (error: unknown) {
        console.error('Erro ao inicializar banco de dados', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    void bootstrap();

    return (): void => {
      mounted = false;
    };
  }, [carregarDados]);

  const totalSaidas = useMemo(
    () => transacoes.reduce((soma, item) => (item.valor < 0 ? soma + item.valor : soma), 0),
    [transacoes],
  );

  const saldoAtual = useMemo(
    () => transacoes.reduce((soma, item) => soma + item.valor, 0),
    [transacoes],
  );

  const totaisPorDia = useMemo((): [string, number][] => {
    const agrupado = new Map<string, number>();

    for (const item of transacoes) {
      agrupado.set(item.data, (agrupado.get(item.data) ?? 0) + item.valor);
    }

    return [...agrupado.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [transacoes]);

  const itensPorTransacao = useMemo(() => {
    const agrupado = new Map<string, ItemTransacao[]>();

    for (const item of itens) {
      const atuais = agrupado.get(item.transacao_id) ?? [];
      atuais.push(item);
      agrupado.set(item.transacao_id, atuais);
    }

    return agrupado;
  }, [itens]);

  const nomeEmpresa = useCallback(
    (id?: string | null): string => empresas.find((empresa) => empresa.id === id)?.nome ?? '',
    [empresas],
  );

  const adicionarLancamento = useCallback(
    async (lancamento: NovoLancamento): Promise<void> => {
      const agora = new Date().toISOString();
      const transacaoId = uuid4();

      await insertTransacao({
        id: transacaoId,
        descricao: lancamento.descricao,
        valor: lancamento.valor,
        data: lancamento.data,
        empresa_id: lancamento.empresaId,
        created_at: agora,
      });

      for (const item of lancamento.itens) {
        await insertItemTransacao({
          id: uuid4(),
          transacao_id: transacaoId,
          produto_id: item.produtoId,
          variante_id: item.varianteId,
          descricao: item.descricao,
          valor: item.precoUnitario,
          quantidade: item.quantidade,
          created_at: agora,
        });

        if (item.produtoId && item.varianteId) {
          await registrarPrecoVariante({
            produtoId: item.produtoId,
            varianteId: item.varianteId,
            empresaId: lancamento.empresaId,
            preco: item.precoUnitario,
            data: toDataHistorico(lancamento.data),
          });
        }
      }

      await carregarDados();
    },
    [carregarDados],
  );

  const removerTransacao = useCallback(
    (id: string): void => {
      void (async (): Promise<void> => {
        try {
          await deleteItensTransacaoByTransacao(id);
          await deleteTransacaoById(id);
          await carregarDados();
        } catch (error: unknown) {
          console.error('Erro ao remover lancamento', error);
        }
      })();
    },
    [carregarDados],
  );

  return {
    loading,
    transacoes,
    totalSaidas,
    saldoAtual,
    totaisPorDia,
    itensPorTransacao,
    nomeEmpresa,
    adicionarLancamento,
    removerTransacao,
  };
}
