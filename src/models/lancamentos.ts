import dayjs from 'dayjs';
import { v4 as uuid4 } from 'uuid';
import { emTransacao } from './database';
import { insertItemTransacao } from './itensTransacao';
import { criarCompraParcelada } from './materializacaoPlanos';
import { registrarPrecoVariante } from './produtoVariantes';
import { insertTransacao } from './transacoesModel';

/** Um item comprado no lancamento. */
export type ItemDoLancamento = {
  produtoId: string | null;
  varianteId: string | null;
  descricao: string;
  quantidade: number;
  precoUnitario: number;
};

export type DadosLancamento = {
  descricao: string;
  /** YYYY-MM-DD. */
  data: string;
  empresaId: string | null;
  categoriaId: string | null;
  /** Valor ja com sinal: negativo para saida, positivo para entrada. */
  valor: number;
  itens: ItemDoLancamento[];
  /** Quando informado, o valor vira um plano e o caixa recebe as parcelas. */
  parcelamento?: { parcelas: number; primeiraParcela: string } | null;
};

/** Data com hora local, para o historico de precos ser exibido no dia correto. */
const toDataHistorico = (data: string): string => dayjs(data).format('YYYY-MM-DDTHH:mm:ss');

/**
 * Grava um lancamento com seus itens e registra o preco pago de cada variante.
 *
 * Tudo ou nada: uma falha no meio nao deixa o lancamento gravado sem parte dos
 * itens (ou o plano sem as parcelas). Usado pela Home e pela lista de compras.
 */
export const registrarLancamento = async (dados: DadosLancamento, local: number): Promise<void> =>
  emTransacao(async () => {
    const agora = new Date().toISOString();
    const parcelamento = dados.parcelamento;

    /**
     * No parcelamento os itens vao para a transacao da compra (valor cheio),
     * nunca para a parcela: a parcela e caixa, a compra e o que foi comprado.
     */
    let transacaoDosItens: string;

    if (parcelamento && parcelamento.parcelas > 1) {
      const { compraTransacaoId } = await criarCompraParcelada({
        descricao: dados.descricao,
        empresaId: dados.empresaId,
        valorTotal: dados.valor,
        dataCompra: dados.data,
        parcelas: parcelamento.parcelas,
        primeiraParcela: parcelamento.primeiraParcela,
        local,
        categoriaId: dados.categoriaId,
      });

      transacaoDosItens = compraTransacaoId;
    } else {
      transacaoDosItens = uuid4();

      await insertTransacao({
        id: transacaoDosItens,
        descricao: dados.descricao,
        valor: dados.valor,
        data: dados.data,
        empresa_id: dados.empresaId,
        categoria_id: dados.categoriaId,
        local,
        created_at: agora,
      });
    }

    for (const item of dados.itens) {
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
          empresaId: dados.empresaId,
          preco: item.precoUnitario,
          data: toDataHistorico(dados.data),
          local,
        });
      }
    }
  });
