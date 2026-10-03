type ItemComTransacao = { transacao_id: string };

type TransacaoResumida = {
  id: string;
  plano_id?: string | null;
  parcela_numero?: number | null;
};

/**
 * Agrupa os itens pela transacao exibida na tela.
 *
 * Os itens de uma compra parcelada pertencem a transacao da compra (parcela
 * 0), que fica fora do caixa e nao aparece nas listas. Para eles nao sumirem,
 * sao mostrados na 1a parcela - a unica que cai no mes da compra.
 */
export const agruparItensPorTransacao = <I extends ItemComTransacao>(
  itens: I[],
  compras: TransacaoResumida[],
  transacoes: TransacaoResumida[],
): Map<string, I[]> => {
  const agrupado = new Map<string, I[]>();

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
};
