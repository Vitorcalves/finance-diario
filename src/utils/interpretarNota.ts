import dayjs from 'dayjs';
import type { RascunhoLancamento } from '../views/Home/types';

/**
 * Interpreta uma nota rapida ("almoço 35 ontem no cartão") e monta o rascunho
 * que o formulario de lancamento abre para o usuario conferir.
 *
 * Tudo por regras, sem rede: valor, data (hoje, ontem, dia 5, 05/11, terça),
 * parcelas (3x), entrada ("recebi"), conta, empresa e categoria pelo nome
 * cadastrado. O que nao for reconhecido fica na descricao; errar aqui custa
 * pouco, porque nada e gravado sem passar pelo formulario.
 */

export type CatalogoNota = {
  contas: { id: string; nome: string; tipo: string }[];
  empresas: { id: string; nome: string }[];
  categorias: { id: string; nome: string; tipo: string }[];
  /** Categoria usada por ultimo em cada empresa, quando a nota nao cita uma. */
  categoriaPorEmpresa?: Map<string, string>;
};

/** Palavras de ligacao que sobram na descricao quando o que vinha depois sai. */
const CONECTORES = new Set([
  'a',
  'o',
  'as',
  'os',
  'ao',
  'de',
  'do',
  'da',
  'dos',
  'das',
  'em',
  'no',
  'na',
  'nos',
  'nas',
  'num',
  'numa',
  'com',
  'pelo',
  'pela',
  'por',
  'pro',
  'pra',
  'para',
  'via',
  'e',
  'foi',
  'gastei',
  'paguei',
  'custou',
  'deu',
]);

const DIAS_SEMANA = ['domingo', 'segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado'];

/**
 * Minusculas, sem acento e so com espaco como separador, caractere a
 * caractere (unidades UTF-16): os indices batem com o texto original. Assim
 * as regexes podem usar `\b` e `[a-z]`, sem lookbehind nem `\p{L}`.
 */
const normalizar = (texto: string): string =>
  texto
    .toLowerCase()
    .split('')
    .map((c) => {
      const base = c.normalize('NFD').replace(/[̀-ͯ]/g, '');
      return base.length === 1 ? base : c;
    })
    .join('')
    .replace(/\s/g, ' ');

const escaparRegex = (texto: string): string => texto.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Regex (global) que acha `nome` como palavra(s) inteira(s), tolerando espacos repetidos. */
const regexNome = (nome: string): RegExp | null => {
  const partes = normalizar(nome).trim().split(/\s+/).filter(Boolean);
  const junto = partes.join('');

  // Nomes muito curtos ("C6", "XP") casariam com qualquer coisa.
  if (junto.length < 3) {
    return null;
  }

  // `\b` so funciona do lado em que o nome comeca/termina com letra ou digito.
  const inicio = /^[a-z0-9]/.test(junto) ? '\\b' : '';
  const fim = /[a-z0-9]$/.test(junto) ? '\\b' : '';

  return new RegExp(`${inicio}${partes.map(escaparRegex).join('\\s+')}${fim}`, 'g');
};

type Leitor = {
  original: string;
  norm: string;
  usado: boolean[];
};

const consumir = (leitor: Leitor, inicio: number, fim: number): void => {
  for (let i = inicio; i < fim; i += 1) {
    leitor.usado[i] = true;
  }
};

const livre = (leitor: Leitor, inicio: number, fim: number): boolean =>
  leitor.usado.slice(inicio, fim).every((usado) => !usado);

/** Primeiro trecho livre que casa com `regex` (que precisa da flag `g`). */
const acharLivre = (leitor: Leitor, regex: RegExp): RegExpExecArray | null => {
  regex.lastIndex = 0;
  let achado = regex.exec(leitor.norm);

  while (achado) {
    if (achado[0].length > 0 && livre(leitor, achado.index, achado.index + achado[0].length)) {
      return achado;
    }

    regex.lastIndex = achado.index + 1;
    achado = regex.exec(leitor.norm);
  }

  return null;
};

const formatoIso = 'YYYY-MM-DD';

/** Dia `dia` do mes de `hoje`; se ainda nao chegou, o do mes anterior. */
const diaMaisRecente = (hoje: dayjs.Dayjs, dia: number): string | null => {
  if (dia < 1 || dia > 31) {
    return null;
  }

  let mes = hoje.startOf('month');

  if (dia > hoje.date()) {
    mes = mes.subtract(1, 'month');
  }

  if (dia > mes.daysInMonth()) {
    return null;
  }

  return mes.date(dia).format(formatoIso);
};

const lerData = (leitor: Leitor, hoje: dayjs.Dayjs): string | undefined => {
  const relativas: [RegExp, number][] = [
    [/\b(?:anteontem|antes de ontem)\b/g, 2],
    [/\bontem\b/g, 1],
    [/\bhoje\b/g, 0],
  ];

  for (const [regex, dias] of relativas) {
    const achado = acharLivre(leitor, regex);

    if (achado) {
      consumir(leitor, achado.index, achado.index + achado[0].length);
      return hoje.subtract(dias, 'day').format(formatoIso);
    }
  }

  // 05/11, 5-11, 05/11/2026, 05/11/26
  const completa = acharLivre(leitor, /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2}|\d{4}))?\b/g);

  if (completa) {
    const dia = Number(completa[1]);
    const mes = Number(completa[2]);
    const anoTexto = completa[3];
    let ano = anoTexto ? Number(anoTexto.length === 2 ? `20${anoTexto}` : anoTexto) : hoje.year();
    let data = dayjs(`${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`);

    // Sem ano, uma data que ainda nao chegou e do ano passado.
    if (!anoTexto && data.isValid() && data.isAfter(hoje, 'day')) {
      ano -= 1;
      data = data.year(ano);
    }

    if (data.isValid() && data.date() === dia && data.month() + 1 === mes) {
      consumir(leitor, completa.index, completa.index + completa[0].length);
      return data.format(formatoIso);
    }
  }

  const diaDoMes = acharLivre(leitor, /\bdia\s+(\d{1,2})\b/g);

  if (diaDoMes) {
    const data = diaMaisRecente(hoje, Number(diaDoMes[1]));

    if (data) {
      consumir(leitor, diaDoMes.index, diaDoMes.index + diaDoMes[0].length);
      return data;
    }
  }

  const semana = acharLivre(
    leitor,
    /\b(domingo|segunda|terca|quarta|quinta|sexta|sabado)(?:[-\s]feira)?(?:\s+passad[oa])?\b/g,
  );

  if (semana) {
    const alvo = DIAS_SEMANA.indexOf(semana[1]);
    const recuo = (hoje.day() - alvo + 7) % 7;
    consumir(leitor, semana.index, semana.index + semana[0].length);
    return hoje.subtract(recuo, 'day').format(formatoIso);
  }

  return undefined;
};

const lerParcelas = (leitor: Leitor): number | undefined => {
  const achado = acharLivre(leitor, /\b(?:parcelad[oa]\s+)?(?:em\s+)?(\d{1,2})\s*(?:x|vezes)\b/g);

  if (!achado) {
    return undefined;
  }

  consumir(leitor, achado.index, achado.index + achado[0].length);
  const parcelas = Number(achado[1]);
  return parcelas >= 2 ? parcelas : undefined;
};

/**
 * Valor: "35", "35,90", "R$ 35.90", "1.234,56", "35 reais", "35 reais e 90".
 * Com mais de um numero, vale o que tem "R$" ou "reais"; senao, o primeiro.
 */
const lerValor = (leitor: Leitor): number | undefined => {
  const regex =
    /(r\$\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?:[.,](\d{1,2}))?(?![\d.,]*\d)(\s*(?:reais|real|conto|contos|pila)(?:\s+e\s+(\d{1,2})(?:\s*centavos?)?)?)?/g;

  type Candidato = { valor: number; inicio: number; fim: number; marcado: boolean };
  const candidatos: Candidato[] = [];

  regex.lastIndex = 0;
  let achado = regex.exec(leitor.norm);

  while (achado) {
    const inicio = achado.index;
    const fim = inicio + achado[0].length;

    if (livre(leitor, inicio, fim)) {
      const inteiro = Number(achado[2].replace(/\./g, ''));
      const centavosTexto = achado[3] ?? achado[5];
      const centavos = centavosTexto ? Number(centavosTexto.padEnd(2, '0')) : 0;

      candidatos.push({
        valor: inteiro + centavos / 100,
        inicio,
        fim,
        marcado: Boolean(achado[1] || achado[4]),
      });
    }

    achado = regex.exec(leitor.norm);
  }

  const escolhido = candidatos.find((c) => c.marcado) ?? candidatos[0];

  if (!escolhido || escolhido.valor <= 0) {
    return undefined;
  }

  consumir(leitor, escolhido.inicio, escolhido.fim);
  return Math.round(escolhido.valor * 100) / 100;
};

const ehEntrada = (leitor: Leitor): boolean => {
  const verbo = acharLivre(leitor, /\b(?:recebi|ganhei|entrou|entrada de|entrada)\b/g);

  if (verbo) {
    consumir(leitor, verbo.index, verbo.index + verbo[0].length);
    return true;
  }

  // "salario", "reembolso" ficam na descricao, mas tambem indicam entrada.
  return /\b(?:salario|reembolso|rendimento)\b/.test(leitor.norm);
};

/** Acha o primeiro item (nome mais longo primeiro) citado na nota. */
const acharPorNome = <T extends { nome: string }>(
  leitor: Leitor,
  itens: T[],
): { item: T; inicio: number; fim: number } | null => {
  const ordenados = [...itens].sort((a, b) => b.nome.length - a.nome.length);

  for (const item of ordenados) {
    const regex = regexNome(item.nome);

    if (!regex) {
      continue;
    }

    const achado = acharLivre(leitor, regex);

    if (achado) {
      return { item, inicio: achado.index, fim: achado.index + achado[0].length };
    }
  }

  return null;
};

const lerConta = (leitor: Leitor, contas: CatalogoNota['contas']): string | undefined => {
  const porNome = acharPorNome(leitor, contas);

  if (porNome) {
    consumir(leitor, porNome.inicio, porNome.fim);

    // "cartao Nubank": a palavra generica junto do nome tambem sai.
    const generico = acharLivre(leitor, /\bcart(?:ao|oes)(?:\s+de\s+credito)?\b|\bcredito\b/g);
    if (generico) {
      consumir(leitor, generico.index, generico.index + generico[0].length);
    }

    return porNome.item.id;
  }

  const cartao = acharLivre(leitor, /\b(?:cartao(?:\s+de\s+credito)?|credito)\b/g);

  if (cartao) {
    consumir(leitor, cartao.index, cartao.index + cartao[0].length);
    return contas.find((conta) => conta.tipo === 'cartao')?.id;
  }

  // Formas de pagar a vista: saem da descricao e ficam na caixa padrao.
  const aVista = acharLivre(leitor, /\b(?:pix|debito|dinheiro|especie|a vista)\b/g);

  if (aVista) {
    consumir(leitor, aVista.index, aVista.index + aVista[0].length);
  }

  return undefined;
};

/** Junta o que sobrou, sem conectores pendurados nas pontas ou antes do que saiu. */
const montarDescricao = (leitor: Leitor): string => {
  // Conector logo antes de um trecho reconhecido ("de 35", "no cartao") sai junto.
  const regexPalavra = /[a-z0-9$]+/g;

  for (
    let palavra = regexPalavra.exec(leitor.norm);
    palavra;
    palavra = regexPalavra.exec(leitor.norm)
  ) {
    const inicio = palavra.index;
    const fim = inicio + palavra[0].length;

    if (!livre(leitor, inicio, fim) || !CONECTORES.has(palavra[0])) {
      continue;
    }

    const resto = leitor.norm.slice(fim);
    const proxima = fim + (resto.length - resto.trimStart().length);

    if (proxima < leitor.norm.length && leitor.usado[proxima]) {
      consumir(leitor, inicio, fim);
    }
  }

  const sobra = leitor.original
    .split('')
    .map((c, i) => (leitor.usado[i] ? ' ' : c))
    .join('');

  const tokens = sobra
    .replace(/[,;:.!?]+(?=\s|$)/g, ' ')
    .split(/\s+/)
    .filter(Boolean);

  const ehConector = (token: string): boolean => CONECTORES.has(normalizar(token));

  while (tokens.length > 0 && ehConector(tokens[0])) {
    tokens.shift();
  }

  while (tokens.length > 0 && ehConector(tokens[tokens.length - 1])) {
    tokens.pop();
  }

  const texto = tokens.join(' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

export const interpretarNota = (
  texto: string,
  catalogo: CatalogoNota,
  hoje: string = dayjs().format(formatoIso),
): RascunhoLancamento => {
  // `normalizar` troca cada caractere por um so: os indices valem nos dois textos.
  const original = texto.normalize('NFC');
  const leitor: Leitor = {
    original,
    norm: normalizar(original),
    usado: original.split('').map(() => false),
  };
  const dia = dayjs(hoje);

  const tipo = ehEntrada(leitor) ? 'entrada' : 'saida';
  const data = lerData(leitor, dia);
  const parcelas = tipo === 'saida' ? lerParcelas(leitor) : undefined;
  const valor = lerValor(leitor);
  const contaId = lerConta(leitor, catalogo.contas);

  const empresa = acharPorNome(leitor, catalogo.empresas);
  if (empresa) {
    consumir(leitor, empresa.inicio, empresa.fim);
  }

  // A categoria fica na descricao ("Mercado 150" e uma boa descricao).
  const categorias = catalogo.categorias.filter((categoria) => categoria.tipo === tipo);
  const categoriaCitada = acharPorNome(leitor, categorias)?.item.id;
  const categoriaDaEmpresa = empresa
    ? catalogo.categoriaPorEmpresa?.get(empresa.item.id)
    : undefined;
  const categoriaId =
    categoriaCitada ??
    (categorias.some((categoria) => categoria.id === categoriaDaEmpresa)
      ? categoriaDaEmpresa
      : undefined);

  const descricao = montarDescricao(leitor) || empresa?.item.nome;

  const rascunho: RascunhoLancamento = { tipo };

  if (descricao) rascunho.descricao = descricao;
  if (valor !== undefined) rascunho.valor = valor;
  if (data) rascunho.data = data;
  if (contaId) rascunho.contaId = contaId;
  if (parcelas) rascunho.parcelas = parcelas;
  if (empresa) rascunho.empresaId = empresa.item.id;
  if (categoriaId) rascunho.categoriaId = categoriaId;

  return rascunho;
};
