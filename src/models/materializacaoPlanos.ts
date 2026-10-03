import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { Locais } from '../utils/local';
import {
  type FrequenciaPlano,
  ocorrenciasAte,
  parcelasDaCompra,
  rotuloParcela,
} from '../utils/parcelas';
import { emTransacao, getConnection } from './database';
import {
  atualizarGeradoAte,
  insertPlano,
  listPlanosAtivos,
  type PlanoPagamento,
  updatePlano,
} from './planosPagamento';
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
  contabilizado: boolean;
};

/**
 * `INSERT OR IGNORE` + indice unico `(plano_id, parcela_numero)`: se o gerador
 * rodar duas vezes para o mesmo periodo, a segunda passada nao cria nada.
 */
const gravarOcorrencia = async (ocorrencia: OcorrenciaGravada): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT OR IGNORE INTO transacoes (id, descricao, valor, data, empresa_id,
                                          contabilizado_saldo, plano_id, parcela_numero,
                                          categoria_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      uuidv4(),
      ocorrencia.descricao,
      ocorrencia.valor,
      ocorrencia.data,
      ocorrencia.empresaId ?? null,
      ocorrencia.contabilizado ? 1 : 0,
      ocorrencia.planoId,
      ocorrencia.numero,
      ocorrencia.categoriaId ?? null,
      new Date().toISOString(),
    ],
  );
};

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
    created_at: agora,
  });

  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO transacoes (id, descricao, valor, data, empresa_id, contabilizado_saldo,
                                plano_id, parcela_numero, local, categoria_id, created_at)
        VALUES (?, ?, ?, ?, ?, 0, ?, 0, ?, ?, ?)
    `,
    [
      compraTransacaoId,
      dados.descricao,
      dados.valorTotal,
      dados.dataCompra,
      dados.empresaId,
      planoId,
      dados.local ?? Locais.padrao,
      dados.categoriaId ?? null,
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
      contabilizado: true,
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
      contabilizado: true,
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
  });
