import type { PlanoPagamento } from '../../models/planosPagamento';
import type { FrequenciaPlano } from '../../utils/parcelas';

/** Plano com os numeros que a tela precisa, ja derivados das cobrancas gravadas. */
export type PlanoNaTela = {
  plano: PlanoPagamento;
  /** Sempre positivo, para exibicao. */
  valorParcela: number;
  /** Data da proxima cobranca a vencer; `null` quando o plano terminou. */
  proximaCobranca: string | null;
  /** Parcelamento que ja pagou todas as parcelas: nada mais a vencer. */
  concluido: boolean;
  /** Ainda gera cobranca: nem encerrado a mao, nem quitado. */
  emAndamento: boolean;
  /** Quantas cobrancas ja aconteceram. */
  cobrancasPagas: number;
  /** Quanto ja foi pago, somando as cobrancas realizadas. */
  totalPago: number;
  /** Peso do plano em um mes, normalizado pela frequencia. */
  custoMensal: number;
  empresa: string;
};

export type ResumoPlanos = {
  /** Soma mensal equivalente das assinaturas ativas. */
  assinaturasPorMes: number;
  /** Soma das parcelas que ainda vao vencer, de todos os parcelamentos. */
  parcelasAVencer: number;
  /** Quanto os planos ativos comprometem do mes corrente. */
  comprometidoNoMes: number;
};

/** Campos do formulario de assinatura. */
export type DadosFormularioAssinatura = {
  descricao: string;
  empresaId: string | null;
  categoriaId: string | null;
  /** Valor da cobranca, positivo; o sinal e aplicado ao salvar. */
  valor: number;
  dataInicio: string;
  frequencia: FrequenciaPlano;
  intervalo: number;
};
