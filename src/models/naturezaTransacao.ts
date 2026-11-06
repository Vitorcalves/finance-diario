/**
 * Natureza de cada linha de `transacoes`: o que ela e, gravado junto com o
 * lancamento (migration 015). As consultas filtram por aqui, em vez de
 * deduzir o tipo de uma combinacao de `contabilizado_saldo`,
 * `conta_destino_id`, `fatura_id` e `parcela_numero`.
 *
 * - `movimento`: gasto ou entrada direto numa conta (a vista, parcela ou
 *   assinatura no caixa, salario). Sai de `conta_id` ou entra nela.
 * - `compra_cartao`: compra no cartao (a vista ou parcela), presa a fatura do
 *   ciclo. Vira divida do cartao; o caixa so sente no pagamento da fatura.
 * - `registro_compra`: a parcela 0 da compra parcelada. Guarda os itens e o
 *   valor cheio, mas nao mexe em saldo nenhum: quem pesa sao as parcelas.
 * - `transferencia`: dinheiro de `conta_id` para `conta_destino_id` (aporte,
 *   resgate, pagamento avulso). Nao e gasto nem receita.
 * - `pagamento_fatura`: sai da conta pagante (`conta_id`) e quita o cartao
 *   (`conta_destino_id`). Tambem nao e gasto: o gasto foi a compra.
 */
export type NaturezaTransacao =
  | 'movimento'
  | 'compra_cartao'
  | 'registro_compra'
  | 'transferencia'
  | 'pagamento_fatura';

/** Gasto e receita (Home, Mensal, projecao, planos): a compra no cartao conta no mes dela. */
export const NATUREZAS_DO_FLUXO: readonly NaturezaTransacao[] = ['movimento', 'compra_cartao'];

/** O que mexe direto no dinheiro de uma conta, sem passar por fatura. */
export const NATUREZAS_DE_CAIXA: readonly NaturezaTransacao[] = [
  'movimento',
  'transferencia',
  'pagamento_fatura',
];

/** Tudo o que o usuario lancou e pode ver (feed, busca): so o registro da compra parcelada fica de fora. */
export const NATUREZAS_VISIVEIS: readonly NaturezaTransacao[] = [
  'movimento',
  'compra_cartao',
  'transferencia',
  'pagamento_fatura',
];

/** Lista para `natureza IN (...)`. So recebe as constantes deste modulo, nunca texto digitado. */
export const naturezasSql = (naturezas: readonly NaturezaTransacao[]): string =>
  naturezas.map((natureza) => `'${natureza}'`).join(', ');

/**
 * Valor de `contabilizado_saldo`, que virou legado: continua gravado, a
 * partir da natureza, so para o banco ficar coerente. Nenhuma consulta le.
 */
export const contabilizadoDe = (natureza: NaturezaTransacao): number =>
  natureza === 'compra_cartao' || natureza === 'registro_compra' ? 0 : 1;
