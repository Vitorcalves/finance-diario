import dayjs from 'dayjs';
import { v4 as uuid4 } from 'uuid';
import { faturaDaCompra } from '../utils/cartao';
import { CONTA_CAIXA_PADRAO, getContaById } from './contas';
import { emTransacao } from './database';
import { garantirFatura } from './faturas';
import { insertItemTransacao } from './itensTransacao';
import { criarCompraParcelada } from './materializacaoPlanos';
import { registrarPrecoVariante } from './produtoVariantes';
import { insertTransacao } from './transacoesModel';

export { CONTA_CAIXA_PADRAO };

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
  /** Quando informado, o valor vira um plano e a conta recebe as parcelas. */
  parcelamento?: { parcelas: number; primeiraParcela: string } | null;
  /**
   * Conta do lancamento; `null`/ausente usa a caixa padrao. No cartao, a
   * compra a vista cai na fatura do ciclo e cada parcela cai na fatura do
   * ciclo da propria parcela.
   */
  contaId?: string | null;
  /**
   * Quando informado, o lancamento e uma transferencia entre contas (aporte
   * em reserva, resgate, pagamento avulso): uma unica linha carrega a conta
   * de origem em `contaId` e a de destino aqui, com o valor negativo saindo
   * da origem e entrando no destino.
   */
  contaDestinoId?: string | null;
};

/** Data com hora local, para o historico de precos ser exibido no dia correto. */
const toDataHistorico = (data: string): string => dayjs(data).format('YYYY-MM-DDTHH:mm:ss');

/**
 * Grava um lancamento com seus itens e registra o preco pago de cada variante.
 *
 * Tudo ou nada: uma falha no meio nao deixa o lancamento gravado sem parte dos
 * itens (ou o plano sem as parcelas). Usado pela Home e pela lista de compras.
 *
 * Compra no cartao: a transacao da compra fica fora do caixa
 * (`contabilizado_saldo = 0`) presa a fatura do ciclo; o caixa so e afetado
 * quando a fatura e paga.
 */
export const registrarLancamento = async (dados: DadosLancamento, local: number): Promise<void> =>
  emTransacao(async () => {
    const agora = new Date().toISOString();
    const parcelamento = dados.parcelamento;
    const conta = dados.contaId ? await getContaById(dados.contaId) : null;
    const contaId = conta?.id ?? CONTA_CAIXA_PADRAO;

    // Transferencia entre contas: uma linha so, sem itens nem fatura.
    if (dados.contaDestinoId) {
      if (!(Math.abs(dados.valor) > 0)) {
        throw new Error('Transferência precisa de um valor maior que zero.');
      }

      const destino = await getContaById(dados.contaDestinoId);

      if (!destino) {
        throw new Error('Conta de destino da transferência não encontrada.');
      }

      if (destino.id === contaId) {
        throw new Error('Origem e destino da transferência precisam ser contas diferentes.');
      }

      await insertTransacao({
        id: uuid4(),
        descricao: dados.descricao,
        valor: -Math.abs(dados.valor),
        data: dados.data,
        empresa_id: null,
        categoria_id: null,
        local,
        conta_id: contaId,
        conta_destino_id: destino.id,
        contabilizado_saldo: 1,
        created_at: agora,
      });

      return;
    }

    // Fatura do ciclo da compra no cartao; nasce aqui mesmo, se preciso.
    // No parcelamento (2+), e o criarCompraParcelada que amarra cada parcela a
    // fatura do ciclo da data da parcela (gravarOcorrencia).
    const emPlano = Boolean(parcelamento && parcelamento.parcelas > 1);
    const fatura =
      conta?.tipo === 'cartao' &&
      !emPlano &&
      conta.dia_fechamento != null &&
      conta.dia_vencimento != null
        ? await garantirFatura(
            conta.id,
            faturaDaCompra(dados.data, conta.dia_fechamento, conta.dia_vencimento),
          )
        : null;

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
        contaId,
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
        conta_id: fatura ? conta?.id : contaId,
        fatura_id: fatura?.id ?? null,
        contabilizado_saldo: fatura ? 0 : 1,
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
