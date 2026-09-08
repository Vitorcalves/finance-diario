import { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { v4 as uuid4 } from 'uuid';
import {
  deleteItensTransacaoByTransacao,
  insertItemTransacao,
  type ItemTransacao,
  listItensTransacao,
} from '../../models/itensTransacao';
import {
  deleteTransacaoById,
  insertTransacao,
  listTransacoes,
  listTransacoesCompra,
  type Transacoes,
} from '../../models/transacoesModel';
import { criarCompraParcelada, materializarPlanos } from '../../models/materializacaoPlanos';
import { registrarPrecoVariante } from '../../models/produtoVariantes';
import { type Empresa, listEmpresas } from '../../models/empresas';
import type { NovoLancamento } from './types';

/** Data com hora local, para o historico de precos ser exibido no dia correto. */
const toDataHistorico = (data: string): string => dayjs(data).format('YYYY-MM-DDTHH:mm:ss');

const hojeIso = (): string => dayjs().format('YYYY-MM-DD');

/** Uma cobranca com data futura ja esta lancada, mas ainda nao saiu do bolso. */
const realizada = (transacao: Transacoes, hoje: string): boolean => transacao.data <= hoje;

export type UseHome = {
  loading: boolean;
  transacoes: Transacoes[];
  /** Total das saidas ja realizadas (valor negativo somado). */
  totalSaidas: number;
  /** Entradas menos saidas, contando so o que ja aconteceu. */
  saldoAtual: number;
  /** Saidas ja lancadas com data futura: parcelas e assinaturas a vencer. */
  comprometidoFuturo: number;
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
  const [compras, setCompras] = useState<Transacoes[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const carregarDados = useCallback(async (): Promise<void> => {
    // Antes de ler: as assinaturas do mes corrente precisam existir como linha.
    await materializarPlanos();

    // So ate o fim do mes: as parcelas dos meses seguintes ja aparecem no
    // total comprometido e na tela de assinaturas.
    const ateData = dayjs().endOf('month').format('YYYY-MM-DD');

    const [transacoesDoBanco, itensDoBanco, comprasDoBanco, empresasDoBanco] = await Promise.all([
      listTransacoes(null, null, { ateData }),
      listItensTransacao(),
      listTransacoesCompra(),
      listEmpresas(),
    ]);

    setTransacoes(transacoesDoBanco);
    setItens(itensDoBanco);
    setCompras(comprasDoBanco);
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

  const totalSaidas = useMemo(() => {
    const hoje = hojeIso();

    return transacoes.reduce(
      (soma, item) => (item.valor < 0 && realizada(item, hoje) ? soma + item.valor : soma),
      0,
    );
  }, [transacoes]);

  const saldoAtual = useMemo(() => {
    const hoje = hojeIso();

    return transacoes.reduce((soma, item) => (realizada(item, hoje) ? soma + item.valor : soma), 0);
  }, [transacoes]);

  const comprometidoFuturo = useMemo(() => {
    const hoje = hojeIso();

    return transacoes.reduce(
      (soma, item) => (item.valor < 0 && !realizada(item, hoje) ? soma + item.valor : soma),
      0,
    );
  }, [transacoes]);

  const totaisPorDia = useMemo((): [string, number][] => {
    const agrupado = new Map<string, number>();

    for (const item of transacoes) {
      agrupado.set(item.data, (agrupado.get(item.data) ?? 0) + item.valor);
    }

    return [...agrupado.entries()].sort(([a], [b]) => (a < b ? 1 : -1));
  }, [transacoes]);

  /**
   * Os itens de uma compra parcelada pertencem a transacao da compra, que fica
   * fora do caixa e nao aparece na lista. Para eles nao sumirem da tela, sao
   * mostrados na 1a parcela - a unica que cai no mes da compra.
   */
  const itensPorTransacao = useMemo(() => {
    const agrupado = new Map<string, ItemTransacao[]>();

    for (const item of itens) {
      const atuais = agrupado.get(item.transacao_id) ?? [];
      atuais.push(item);
      agrupado.set(item.transacao_id, atuais);
    }

    const compraPorPlano = new Map<string, string>();

    for (const compra of compras) {
      if (compra.plano_id) {
        compraPorPlano.set(compra.plano_id, compra.id);
      }
    }

    for (const transacao of transacoes) {
      if (!transacao.plano_id || transacao.parcela_numero !== 1) {
        continue;
      }

      const compraId = compraPorPlano.get(transacao.plano_id);
      const itensDaCompra = compraId ? agrupado.get(compraId) : undefined;

      if (itensDaCompra) {
        agrupado.set(transacao.id, itensDaCompra);
      }
    }

    return agrupado;
  }, [itens, compras, transacoes]);

  const nomeEmpresa = useCallback(
    (id?: string | null): string => empresas.find((empresa) => empresa.id === id)?.nome ?? '',
    [empresas],
  );

  const adicionarLancamento = useCallback(
    async (lancamento: NovoLancamento): Promise<void> => {
      const agora = new Date().toISOString();
      const parcelamento = lancamento.parcelamento;

      /**
       * No parcelamento os itens vao para a transacao da compra (valor cheio),
       * nunca para a parcela: a parcela e caixa, a compra e o que foi comprado.
       */
      let transacaoDosItens: string;

      if (parcelamento && parcelamento.parcelas > 1) {
        const { compraTransacaoId } = await criarCompraParcelada({
          descricao: lancamento.descricao,
          empresaId: lancamento.empresaId,
          valorTotal: lancamento.valor,
          dataCompra: lancamento.data,
          parcelas: parcelamento.parcelas,
          primeiraParcela: parcelamento.primeiraParcela,
        });

        transacaoDosItens = compraTransacaoId;
      } else {
        transacaoDosItens = uuid4();

        await insertTransacao({
          id: transacaoDosItens,
          descricao: lancamento.descricao,
          valor: lancamento.valor,
          data: lancamento.data,
          empresa_id: lancamento.empresaId,
          created_at: agora,
        });
      }

      for (const item of lancamento.itens) {
        await insertItemTransacao({
          id: uuid4(),
          transacao_id: transacaoDosItens,
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
    comprometidoFuturo,
    totaisPorDia,
    itensPorTransacao,
    nomeEmpresa,
    adicionarLancamento,
    removerTransacao,
  };
}
