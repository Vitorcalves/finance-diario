import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { faturaDaCompra } from '../utils/cartao';
import { Locais } from '../utils/local';
import {
  type FrequenciaPlano,
  ocorrenciasAte,
  parcelasDaCompra,
  rotuloParcela,
} from '../utils/parcelas';
import { CONTA_CAIXA_PADRAO, getContaById } from './contas';
import { emTransacao, getConnection } from './database';
import { apagarFaturasVazias, garantirFatura } from './faturas';
import { contabilizadoDe, type NaturezaTransacao } from './naturezaTransacao';
import {
  atualizarGeradoAte,
  insertPlano,
  listPlanosAtivos,
  type PlanoPagamento,
  updatePlano,
} from './planosPagamento';
import { herdarTagsDoPlano } from './tags';
import { deleteTransacoesFuturasDoPlano } from './transacoesModel';

/**
 * Materializacao dos planos: transforma a regra em linhas de `transacoes`.
 *
 * Parcelamento e gerado inteiro no ato da compra, porque o compromisso ja e
 * conhecido. Assinatura e gerada sob demanda ate um horizonte, porque nao tem
 * fim previsto.
 */

/** Ate onde materializar por padrao: o fim do mes corrente. */
export const horizontePadrao = (): string => dayjs().endOf('month').format('YYYY-MM-DD');

type OcorrenciaGravada = {
  planoId: string;
  numero: number;
  descricao: string;
  valor: number;
  data: string;
  empresaId?: string | null;
  categoriaId?: string | null;
  /** Conta que recebe a cobranca; padrao: caixa global. No cartao, vai para a fatura do ciclo. */
  contaId?: string | null;
  /**
   * So entrada programada (salario): quando preenchido, a cobranca e gravada
   * como entrada direta nessa conta (renda), sem origem.
   */
  contaDestinoId?: string | null;
};

/**
 * `INSERT OR IGNORE` + indice unico `(plano_id, parcela_numero)`: se o gerador
 * rodar duas vezes para o mesmo periodo, a segunda passada nao cria nada.
 *
 * Cobranca em cartao segue a regra da compra no cartao (`compra_cartao`):
 * fica presa a fatura do ciclo e o caixa so e afetado quando a fatura e paga.
 * Cobranca com `contaDestinoId` e uma entrada programada (salario): valor
 * positivo entrando direto na conta, sem transferencia de origem. A cobranca
 * nova herda as tags das que o plano ja tem.
 */
const gravarOcorrencia = async (ocorrencia: OcorrenciaGravada): Promise<void> => {
  const db = await getConnection();
  const conta = await getContaById(ocorrencia.contaId ?? CONTA_CAIXA_PADRAO);
  const contaId = conta?.id ?? CONTA_CAIXA_PADRAO;
  const id = uuidv4();
  const agora = new Date().toISOString();

  if (ocorrencia.contaDestinoId) {
    const { changes } = await db.runAsync(
      `
          INSERT OR IGNORE INTO transacoes (id, descricao, valor, data, empresa_id, natureza,
                                            contabilizado_saldo, plano_id, parcela_numero,
                                            categoria_id, conta_id, created_at)
          VALUES (?, ?, ?, ?, NULL, 'movimento', ?, ?, ?, ?, ?, ?)
      `,
      [
        id,
        ocorrencia.descricao,
        Math.abs(ocorrencia.valor),
        ocorrencia.data,
        contabilizadoDe('movimento'),
        ocorrencia.planoId,
        ocorrencia.numero,
        ocorrencia.categoriaId ?? null,
        ocorrencia.contaDestinoId,
        agora,
      ],
    );

    if (changes > 0) {
      await herdarTagsDoPlano(id, ocorrencia.planoId, agora);
    }

    return;
  }

  const fatura =
    conta?.tipo === 'cartao' && conta.dia_fechamento != null && conta.dia_vencimento != null
      ? await garantirFatura(
          conta.id,
          faturaDaCompra(ocorrencia.data, conta.dia_fechamento, conta.dia_vencimento),
        )
      : null;
  const natureza: NaturezaTransacao = fatura ? 'compra_cartao' : 'movimento';

  const { changes } = await db.runAsync(
    `
        INSERT OR IGNORE INTO transacoes (id, descricao, valor, data, empresa_id, natureza,
                                          contabilizado_saldo, plano_id, parcela_numero,
                                          categoria_id, conta_id, fatura_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      id,
      ocorrencia.descricao,
      ocorrencia.valor,
      ocorrencia.data,
      ocorrencia.empresaId ?? null,
      natureza,
      contabilizadoDe(natureza),
      ocorrencia.planoId,
      ocorrencia.numero,
      ocorrencia.categoriaId ?? null,
      contaId,
      fatura?.id ?? null,
      agora,
    ],
  );

  // Ignorada (cobranca ja gerada), a linha nao existe para receber tags.
  if (changes > 0) {
    await herdarTagsDoPlano(id, ocorrencia.planoId, agora);
  }
};

/** Conta que paga as cobrancas de um plano; `null` no plano = caixa padrao. */
const contaDoPlano = (plano: PlanoPagamento): string => plano.conta_id ?? CONTA_CAIXA_PADRAO;

const ultimaParcelaGerada = async (planoId: string): Promise<number> => {
  const db = await getConnection();

  const row = await db.getFirstAsync<{ maximo: number | null }>(
    'SELECT MAX(parcela_numero) AS maximo FROM transacoes WHERE plano_id = ?',
    [planoId],
  );

  return row?.maximo ?? 0;
};

export type DadosCompraParcelada = {
  descricao: string;
  empresaId: string | null;
  /** Total da compra ja com sinal (negativo para saida). */
  valorTotal: number;
  /** Data em que a compra aconteceu: e ela que vale para itens e precos. */
  dataCompra: string;
  parcelas: number;
  /** Vencimento da 1a parcela; pode ser depois da data da compra. */
  primeiraParcela: string;
  frequencia?: FrequenciaPlano;
  intervalo?: number;
  /** Local onde a compra aconteceu; ver `Locais`. */
  local?: number;
  /** Categoria da compra, herdada pelas parcelas. */
  categoriaId?: string | null;
  /** Conta da compra e das parcelas; padrao: caixa global. */
  contaId?: string | null;
  /** Chave da NFC-e lida pelo QR Code; vai so no registro da compra (parcela 0). */
  chaveNfce?: string | null;
};

export type CompraParceladaCriada = {
  planoId: string;
  /**
   * Transacao da compra (parcela 0). Fica fora do caixa, mas e a dona dos itens
   * e do historico de precos: o valor dela e o preco a vista, nao o da parcela.
   */
  compraTransacaoId: string;
};

/**
 * Cria o plano, a transacao da compra e todas as parcelas de uma vez - numa
 * transacao: ou tudo e gravado, ou nada.
 */
export const criarCompraParcelada = async (
  dados: DadosCompraParcelada,
): Promise<CompraParceladaCriada> => emTransacao(() => gravarCompraParcelada(dados));

const gravarCompraParcelada = async (
  dados: DadosCompraParcelada,
): Promise<CompraParceladaCriada> => {
  const frequencia = dados.frequencia ?? 'mensal';
  const intervalo = dados.intervalo ?? 1;
  const agora = new Date().toISOString();
  const planoId = uuidv4();
  const compraTransacaoId = uuidv4();

  const parcelas = parcelasDaCompra(
    dados.valorTotal,
    dados.parcelas,
    dados.primeiraParcela,
    frequencia,
    intervalo,
  );

  const ultimaParcela = parcelas[parcelas.length - 1];

  await insertPlano({
    id: planoId,
    tipo: 'parcelamento',
    descricao: dados.descricao,
    empresa_id: dados.empresaId,
    valor_parcela: parcelas[0]?.valor ?? dados.valorTotal,
    valor_total: dados.valorTotal,
    total_parcelas: dados.parcelas,
    frequencia,
    intervalo,
    data_inicio: dados.primeiraParcela,
    data_fim: ultimaParcela?.data ?? dados.primeiraParcela,
    ativo: 1,
    gerado_ate: ultimaParcela?.data ?? null,
    categoria_id: dados.categoriaId ?? null,
    conta_id: dados.contaId ?? null,
    created_at: agora,
  });

  const db = await getConnection();

  // Registro da compra (parcela 0): dono dos itens, fora de qualquer saldo.
  await db.runAsync(
    `
        INSERT INTO transacoes (id, descricao, valor, data, empresa_id, natureza,
                                contabilizado_saldo, plano_id, parcela_numero, local,
                                categoria_id, conta_id, chave_nfce, created_at)
        VALUES (?, ?, ?, ?, ?, 'registro_compra', ?, ?, 0, ?, ?, ?, ?, ?)
    `,
    [
      compraTransacaoId,
      dados.descricao,
      dados.valorTotal,
      dados.dataCompra,
      dados.empresaId,
      contabilizadoDe('registro_compra'),
      planoId,
      dados.local ?? Locais.padrao,
      dados.categoriaId ?? null,
      dados.contaId ?? CONTA_CAIXA_PADRAO,
      dados.chaveNfce ?? null,
      agora,
    ],
  );

  for (const parcela of parcelas) {
    await gravarOcorrencia({
      planoId,
      numero: parcela.numero,
      descricao: `${dados.descricao} (${rotuloParcela(parcela.numero, dados.parcelas)})`,
      valor: parcela.valor,
      data: parcela.data,
      empresaId: dados.empresaId,
      categoriaId: dados.categoriaId ?? null,
      contaId: dados.contaId,
    });
  }

  return { planoId, compraTransacaoId };
};

/** Gera as cobrancas que faltam de um plano. Devolve quantas foram criadas. */
const materializarPlano = async (plano: PlanoPagamento, ateData: string): Promise<number> =>
  emTransacao(() => gerarCobrancas(plano, ateData));

const gerarCobrancas = async (plano: PlanoPagamento, ateData: string): Promise<number> => {
  const proximoNumero = (await ultimaParcelaGerada(plano.id)) + 1;

  const pendentes = ocorrenciasAte({
    dataInicio: plano.data_inicio,
    frequencia: plano.frequencia,
    intervalo: plano.intervalo,
    ateData,
    primeiroNumero: proximoNumero,
    totalOcorrencias: plano.total_parcelas ?? null,
    dataFim: plano.data_fim ?? null,
  })
    // Uma cobranca apagada a mao nao deve voltar no proximo foco da tela.
    .filter((ocorrencia) => !plano.gerado_ate || ocorrencia.data > plano.gerado_ate);

  for (const ocorrencia of pendentes) {
    await gravarOcorrencia({
      planoId: plano.id,
      numero: ocorrencia.numero,
      descricao: `${plano.descricao} (${rotuloParcela(
        ocorrencia.numero,
        plano.total_parcelas ?? null,
      )})`,
      valor: plano.valor_parcela,
      data: ocorrencia.data,
      empresaId: plano.empresa_id,
      categoriaId: plano.categoria_id ?? null,
      contaId: contaDoPlano(plano),
      contaDestinoId: plano.conta_destino_id ?? null,
    });
  }

  await atualizarGeradoAte(plano.id, ateData);

  return pendentes.length;
};

/**
 * Roda todos os planos ativos ate `ateData`.
 *
 * Chamado no boot e ao navegar entre meses: abrir novembro materializa as
 * assinaturas de novembro, e a projecao do mes ja nasce com elas dentro.
 */
export const materializarPlanos = async (ateData: string = horizontePadrao()): Promise<number> => {
  const planos = await listPlanosAtivos();
  let criadas = 0;

  for (const plano of planos) {
    try {
      criadas += await materializarPlano(plano, ateData);
    } catch (error: unknown) {
      console.error(`Erro ao materializar o plano ${plano.descricao}`, error);
    }
  }

  return criadas;
};

export type DadosAssinatura = {
  descricao: string;
  empresaId: string | null;
  /** Valor de cada cobranca, ja com sinal. */
  valorParcela: number;
  dataInicio: string;
  frequencia: FrequenciaPlano;
  intervalo: number;
  /** Encerramento previsto; `null` enquanto a assinatura estiver ativa. */
  dataFim?: string | null;
  categoriaId?: string | null;
  /** Conta que paga a cobranca; padrao: caixa global. */
  contaId?: string | null;
  /**
   * So entrada programada (salario): caixa que recebe a cobranca. Quando
   * preenchido, cada cobranca entra direto nessa conta, sem origem.
   */
  contaDestinoId?: string | null;
};

/** Cria a assinatura e ja materializa as cobrancas ate o horizonte. */
export const criarAssinatura = async (
  dados: DadosAssinatura,
  ateData: string = horizontePadrao(),
): Promise<string> => emTransacao(() => gravarAssinatura(dados, ateData));

const gravarAssinatura = async (dados: DadosAssinatura, ateData: string): Promise<string> => {
  const planoId = uuidv4();

  await insertPlano({
    id: planoId,
    tipo: 'assinatura',
    descricao: dados.descricao,
    empresa_id: dados.empresaId,
    valor_parcela: dados.valorParcela,
    valor_total: null,
    total_parcelas: null,
    frequencia: dados.frequencia,
    intervalo: dados.intervalo,
    data_inicio: dados.dataInicio,
    data_fim: dados.dataFim ?? null,
    ativo: 1,
    gerado_ate: null,
    categoria_id: dados.categoriaId ?? null,
    conta_id: dados.contaId ?? null,
    conta_destino_id: dados.contaDestinoId ?? null,
    created_at: new Date().toISOString(),
  });

  await materializarPlanos(ateData);

  return planoId;
};

/**
 * Encerra o plano na data informada e apaga as cobrancas que ainda nao
 * aconteceram. O que ja foi pago permanece no historico.
 */
export const cancelarPlano = async (
  plano: PlanoPagamento,
  dataFim: string = dayjs().format('YYYY-MM-DD'),
): Promise<void> =>
  emTransacao(async () => {
    await updatePlano({ ...plano, ativo: 0, data_fim: dataFim });
    await deleteTransacoesFuturasDoPlano(plano.id, dataFim);
    // Parcelas futuras apagadas podem ter esvaziado a fatura do ciclo.
    await apagarFaturasVazias();
  });
