import dayjs from 'dayjs';
import type {
  Dominio,
  PontoProjetado,
  PontoSerie,
  RegistroUnitario,
  ResumoPrecos,
  Serie,
  UnidadeBase,
} from './types';

/** Altura util da area de desenho, em pixels. */
export const ALTURA_GRAFICO = 180;

/** Margens da area util: espaco para os rotulos dos eixos. */
export const MARGEM = { topo: 10, direita: 12, base: 22, esquerda: 52 } as const;

/** Quantidade alvo de ticks no eixo vertical. */
const TICKS_Y = 4;

const DIA_MS = 24 * 60 * 60 * 1000;

const toTimestamp = (data: string): number => dayjs(data).startOf('day').valueOf();

/**
 * Reduz varios registros a um ponto por dia (media do dia).
 *
 * Duas compras no mesmo dia, ou cotacoes de mercados diferentes, virariam uma
 * linha vertical no grafico; a media mantem uma leitura por data e `registros`
 * guarda quantos valores entraram nela.
 */
export const agruparPorDia = (registros: { data: string; preco: number }[]): PontoSerie[] => {
  const porDia = new Map<string, { soma: number; registros: number }>();

  for (const registro of registros) {
    const dia = registro.data.slice(0, 10);
    const atual = porDia.get(dia) ?? { soma: 0, registros: 0 };
    atual.soma += registro.preco;
    atual.registros += 1;
    porDia.set(dia, atual);
  }

  return [...porDia.entries()]
    .map(([data, { soma, registros: quantidade }]) => ({
      data,
      valor: soma / quantidade,
      registros: quantidade,
    }))
    .sort((a, b) => toTimestamp(a.data) - toTimestamp(b.data));
};

/**
 * Unidade base comum aos registros, com a regra do historico de precos:
 * registro sem medida fica de fora (e e contado), e medidas de grupos
 * diferentes (kg x un) nao tem base comum.
 */
export const definirUnidadeBase = (registros: RegistroUnitario[]): UnidadeBase => {
  const unitarios = registros.flatMap((registro) => (registro.unitario ? [registro.unitario] : []));

  if (unitarios.length === 0) {
    return { status: 'semMedida' };
  }

  const { unidadeId, sigla } = unitarios[0];

  if (unitarios.some((unitario) => unitario.unidadeId !== unidadeId)) {
    return { status: 'unidadesIncompativeis' };
  }

  return { status: 'ok', unidadeId, sigla, semMedida: registros.length - unitarios.length };
};

/**
 * Precos que vao para o grafico: o do produto ou, com `porUnidade`, o
 * reduzido a unidade base - registro sem medida fica de fora.
 */
export const valoresNaBase = (
  registros: RegistroUnitario[],
  porUnidade: boolean,
): { data: string; preco: number }[] =>
  porUnidade
    ? registros.flatMap(({ data, unitario }) => (unitario ? [{ data, preco: unitario.valor }] : []))
    : registros;

/** Passo "redondo" (1, 2, 5 x 10^n) para dividir um intervalo em ~`alvo` ticks. */
const passoRedondo = (intervalo: number, alvo: number): number => {
  const bruto = intervalo / alvo;
  const magnitude = Math.pow(10, Math.floor(Math.log10(bruto)));
  const normalizado = bruto / magnitude;

  if (normalizado <= 1) {
    return magnitude;
  }

  if (normalizado <= 2) {
    return 2 * magnitude;
  }

  if (normalizado <= 5) {
    return 5 * magnitude;
  }

  return 10 * magnitude;
};

/**
 * Dominio comum das series: eixo do tempo do primeiro ao ultimo dia e eixo de
 * valor arredondado para ticks redondos, com folga para a linha nao encostar
 * nas bordas. Devolve `null` sem nenhum ponto.
 */
export const calcularDominio = (series: Serie[]): Dominio | null => {
  const pontos = series.flatMap((serie) => serie.pontos);

  if (pontos.length === 0) {
    return null;
  }

  const tempos = pontos.map((ponto) => toTimestamp(ponto.data));
  const valores = pontos.map((ponto) => ponto.valor);

  let inicio = Math.min(...tempos);
  let fim = Math.max(...tempos);

  // Um unico dia: abre um dia para cada lado para o ponto cair no meio.
  if (fim === inicio) {
    inicio -= DIA_MS;
    fim += DIA_MS;
  }

  const menor = Math.min(...valores);
  const maior = Math.max(...valores);
  // Valor unico ou todos iguais: abre 10% (ou R$ 1) para nao dividir por zero.
  // Valores proximos: a escala trata a variacao como de ao menos 10% do maior
  // valor (e 4 centavos). Fracao de centavo (R$ 4,998/kg x R$ 5,00/kg) nao vira
  // um sobe e desce do grafico inteiro, e as marcas nunca pedem mais de 2 casas.
  const intervalo =
    maior > menor ? Math.max(maior - menor, maior * 0.1, 0.04) : Math.max(1, Math.abs(maior) * 0.1);
  const passo = passoRedondo(intervalo, TICKS_Y);

  const minimo = Math.max(0, Math.floor((menor - intervalo * 0.05) / passo) * passo);
  const maximo = Math.ceil((maior + intervalo * 0.05) / passo) * passo;

  const ticks: number[] = [];

  for (let valor = minimo; valor <= maximo + passo / 2; valor += passo) {
    ticks.push(Number(valor.toFixed(6)));
  }

  return { inicio, fim, minimo, maximo, ticks };
};

/**
 * `true` quando alguma marca do eixo vertical cai entre dois reais (R$ 4,50):
 * sem os centavos o rotulo dela repetiria o da vizinha.
 */
export const eixoComCentavos = (dominio: Dominio): boolean =>
  dominio.ticks.some((tick) => !Number.isInteger(tick));

/** Converte os pontos de uma serie para pixels dentro da area util. */
export const projetarPontos = (
  pontos: PontoSerie[],
  dominio: Dominio,
  largura: number,
  altura: number,
): PontoProjetado[] => {
  const escalaX = largura / (dominio.fim - dominio.inicio);
  const escalaY = altura / (dominio.maximo - dominio.minimo);

  return pontos.map((ponto) => ({
    x: (toTimestamp(ponto.data) - dominio.inicio) * escalaX,
    y: altura - (ponto.valor - dominio.minimo) * escalaY,
    ponto,
  }));
};

/** Posicao vertical (px) de um valor do eixo, para as linhas de grade. */
export const posicaoY = (valor: number, dominio: Dominio, altura: number): number =>
  altura - ((valor - dominio.minimo) / (dominio.maximo - dominio.minimo)) * altura;

/** Atributo `d` de um `<Path>` ligando os pontos em ordem. */
export const caminhoLinha = (pontos: PontoProjetado[]): string =>
  pontos
    .map((ponto, index) => `${index === 0 ? 'M' : 'L'}${ponto.x.toFixed(1)} ${ponto.y.toFixed(1)}`)
    .join(' ');

/**
 * Datas (YYYY-MM-DD) dos rotulos do eixo horizontal: ate `quantidade` marcas
 * espalhadas uniformemente do primeiro ao ultimo dia.
 */
export const ticksEixoX = (dominio: Dominio, quantidade: number): string[] => {
  const dias = Math.round((dominio.fim - dominio.inicio) / DIA_MS);
  const marcas = Math.max(2, Math.min(quantidade, dias + 1));
  const passo = (dominio.fim - dominio.inicio) / (marcas - 1);

  return Array.from({ length: marcas }, (_, index) =>
    dayjs(dominio.inicio + passo * index).format('YYYY-MM-DD'),
  );
};

/** Indice do ponto mais proximo, na horizontal, de `x`; `null` sem pontos. */
export const pontoMaisProximo = (pontos: PontoProjetado[], x: number): number | null => {
  if (pontos.length === 0) {
    return null;
  }

  let melhor = 0;

  for (let index = 1; index < pontos.length; index += 1) {
    if (Math.abs(pontos[index].x - x) < Math.abs(pontos[melhor].x - x)) {
      melhor = index;
    }
  }

  return melhor;
};

export const resumirPrecos = (pago: PontoSerie[], historico: PontoSerie[]): ResumoPrecos => {
  const ultimoPago = pago.at(-1)?.valor ?? null;
  const anteriorPago = pago.at(-2)?.valor ?? null;
  const valoresPagos = pago.map((ponto) => ponto.valor);

  return {
    ultimoPago,
    variacaoPago:
      ultimoPago !== null && anteriorPago !== null && anteriorPago > 0
        ? ((ultimoPago - anteriorPago) / anteriorPago) * 100
        : null,
    menorPago: valoresPagos.length > 0 ? Math.min(...valoresPagos) : null,
    maiorPago: valoresPagos.length > 0 ? Math.max(...valoresPagos) : null,
    ultimoHistorico: historico.at(-1)?.valor ?? null,
    compras: pago.reduce((soma, ponto) => soma + ponto.registros, 0),
    registros: historico.reduce((soma, ponto) => soma + ponto.registros, 0),
  };
};
