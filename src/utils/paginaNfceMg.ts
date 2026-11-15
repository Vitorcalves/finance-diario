import { lerChaveAcesso, limparChave } from './chaveNfce';
import { toCurrency } from './format';

/**
 * Leitor da pagina da NFC-e no portal da SEFAZ-MG
 * (`portalsped.fazenda.mg.gov.br/portalnfce`), a que aparece depois da
 * verificacao e do "Visualizar".
 *
 * Funcao pura sobre o HTML, sem biblioteca de DOM (o app nao tem e os testes
 * rodam no Node): linhas e celulas saem por expressao regular. Escrita a partir
 * de paginas reais, guardadas em `tests/fixtures/nfce/`. Outro estado entra
 * como outro arquivo (`paginaNfce<UF>.ts`), escolhido pela UF da chave.
 *
 * Regras de leitura do layout de MG (versao 1.2.39 do portal):
 * - itens em `<tbody id="myTable">`, uma linha por item: descricao em `<h7>`,
 *   "(Código: 3875)", "Qtde total de ítens: 0.1960", "UN: KG" e
 *   "Valor total R$: R$ 23,50". Nao ha valor unitario: sai de total / quantidade;
 * - resumo em pares `<strong>rotulo</strong>` / `<strong>valor</strong>`
 *   ("Valor total R$" 41.34, "Valor pago R$", "Forma de Pagamento");
 * - emitente, modelo, serie, numero e data em tabelas com cabecalho (`<th>`);
 * - a quantidade e os totais do resumo usam ponto decimal; os valores dos
 *   itens, virgula.
 */

export type ItemNotaFiscal = {
  /** Codigo do produto no cadastro da loja; `null` quando a nota nao traz. */
  codigo: string | null;
  /** Como veio na nota (`QUEIJO TIROLEZ PARMESAO KG`). */
  descricao: string;
  quantidade: number;
  /** Unidade comercial como veio (`KG`, `UN`...); vazio se a pagina nao traz. */
  unidade: string;
  /** Preco por unidade; sem ele na pagina, total / quantidade (sem arredondar). */
  valorUnitario: number;
  valorTotal: number;
};

export type PagamentoNotaFiscal = {
  /** Codigo da forma (`01` dinheiro, `03` credito, `04` debito, `17` PIX...). */
  codigo: string | null;
  /** Ex.: `Cartão de Débito`. */
  descricao: string;
  valor: number | null;
};

export type NotaFiscalLida = {
  /** Chave mostrada na pagina; `null` se ela nao aparece. */
  chave: string | null;
  emitente: { nome: string; cnpj: string | null };
  /** `YYYY-MM-DDTHH:mm:ss`, hora local da emissao; `null` se nao veio. */
  dataEmissao: string | null;
  numero: number | null;
  serie: number | null;
  itens: ItemNotaFiscal[];
  /** Soma dos itens segundo a nota ("Valor total R$"); sem ela, a soma dos lidos. */
  valorItens: number;
  /** Desconto da nota inteira (positivo); 0 quando a pagina nao mostra. */
  desconto: number;
  /**
   * O que a compra custou: "Valor a pagar" ou, sem ele, o pago menos o troco;
   * sem nada disso, os itens menos o desconto.
   */
  valorPago: number;
  pagamentos: PagamentoNotaFiscal[];
  /** O que nao fechou na leitura, para a tela mostrar. Nunca vira valor inventado. */
  avisos: string[];
};

export type PaginaNfce =
  /** A nota, lida. */
  | { tipo: 'nota'; nota: NotaFiscalLida }
  /** Ainda na tela da verificacao (Turnstile) ou do "Visualizar". */
  | { tipo: 'verificacao' }
  /** A SEFAZ respondeu com erro (nota nao encontrada, chave invalida...). */
  | { tipo: 'nao_encontrada'; mensagem: string }
  /** A pagina mostra a chave de outra nota, nao a do QR Code. */
  | { tipo: 'outra_nota'; chave: string }
  /** Layout que o leitor nao reconhece. */
  | { tipo: 'desconhecida' };

/** Entidades com nome que a pagina pode trazer; as acentuadas sao montadas abaixo. */
const ENTIDADES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  ordm: 'º',
  ordf: 'ª',
  deg: '°',
  middot: '·',
  ndash: '–',
  mdash: '—',
};

// `&aacute;`, `&Atilde;`, `&ccedil;`...: letra + acento, quando compoe um caractere so.
for (const [nome, combinante] of [
  ['acute', '́'],
  ['grave', '̀'],
  ['circ', '̂'],
  ['tilde', '̃'],
  ['uml', '̈'],
  ['cedil', '̧'],
] as const) {
  for (const letra of 'aeiouyAEIOUYcCnN') {
    const composto = `${letra}${combinante}`.normalize('NFC');

    if (composto.length === 1) {
      ENTIDADES[`${letra}${nome}`] = composto;
    }
  }
}

/** Troca as entidades HTML pelo caractere; entidade desconhecida fica como esta. */
export const decodificarEntidades = (texto: string): string =>
  texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (inteira: string, nome: string) => {
    if (nome.startsWith('#')) {
      const codigo =
        nome[1] === 'x' || nome[1] === 'X'
          ? parseInt(nome.slice(2), 16)
          : parseInt(nome.slice(1), 10);

      return Number.isFinite(codigo) && codigo > 0 && codigo <= 0x10ffff
        ? String.fromCodePoint(codigo)
        : inteira;
    }

    return ENTIDADES[nome] ?? inteira;
  });

/** Texto visivel de um trecho de HTML: sem tags, com as entidades e os espacos limpos. */
export const textoDoHtml = (html: string): string =>
  decodificarEntidades(html.replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();

/** Tira o que nao e conteudo: comentarios, scripts e estilos. */
const semCodigo = (html: string): string =>
  html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(script|style|noscript|template)\b[\s\S]*?<\/\1\s*>/gi, ' ');

/**
 * Numero escrito na pagina: `R$ 1.234,56`, `23,50`, `41.34` ou `0.1960`.
 * Com virgula, o ponto separa milhar; sem virgula, um ponto so e a casa
 * decimal (a pagina de MG escreve assim a quantidade e os totais do resumo).
 */
export const lerNumero = (texto: string): number | null => {
  const achado = /-?\d[\d.,]*/.exec(texto);

  if (!achado) {
    return null;
  }

  let numero = achado[0].replace(/[.,]+$/, '');

  if (numero.includes(',')) {
    numero = numero.replace(/\./g, '').replace(',', '.');
  } else if ((numero.match(/\./g) ?? []).length > 1) {
    numero = numero.replace(/\./g, '');
  }

  const valor = Number(numero);
  return Number.isFinite(valor) ? valor : null;
};

/** Conteudo de cada `<tag>...</tag>` do trecho (sem aninhamento da mesma tag). */
const blocos = (html: string, tag: string): string[] =>
  [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}\\s*>`, 'gi'))].map(
    (achado) => achado[1],
  );

/** Minusculo e sem acento, para comparar rotulos ("Qtde total de ítens"). */
const rotulo = (texto: string): string =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Soma em centavos, para nao acumular erro de ponto flutuante. */
const somarCentavos = (valores: number[]): number =>
  valores.reduce((soma, valor) => soma + Math.round(valor * 100), 0) / 100;

const fechaComFolga = (a: number, b: number): boolean => Math.abs(a - b) <= 0.011;

/** CNPJ em 14 caracteres (com letras desde 2026); `null` se nao for um. */
const lerCnpj = (texto: string | undefined): string | null => {
  const limpo = limparChave(texto ?? '');
  return /^[0-9A-Z]{12}\d{2}$/.test(limpo) ? limpo : null;
};

/** `13/11/2026 12:36:31` vira `2026-11-13T12:36:31`. */
const lerDataHora = (texto: string | undefined): string | null => {
  const achado = /(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2})(?::(\d{2}))?)?/.exec(texto ?? '');

  if (!achado) {
    return null;
  }

  const [, dia, mes, ano, hora = '00', minuto = '00', segundo = '00'] = achado;
  return `${ano}-${mes}-${dia}T${hora}:${minuto}:${segundo}`;
};

/**
 * Tabelas com cabecalho: cada uma vira um mapa rotulo do `<th>` -> texto do
 * `<td>` na mesma posicao, na primeira linha de dados.
 */
const tabelasComCabecalho = (html: string): Map<string, string>[] =>
  blocos(html, 'table')
    .map((tabela) => {
      const cabecalhos = blocos(tabela, 'th').map((th) => rotulo(textoDoHtml(th)));
      const corpo = /<tbody\b[^>]*>([\s\S]*?)<\/tbody\s*>/i.exec(tabela)?.[1] ?? '';
      const primeiraLinha = blocos(corpo, 'tr')[0] ?? '';
      const celulas = blocos(primeiraLinha, 'td').map(textoDoHtml);

      return new Map(cabecalhos.map((cabecalho, indice) => [cabecalho, celulas[indice] ?? '']));
    })
    .filter((mapa) => mapa.size > 0);

/** Valor da coluna cujo cabecalho casa com `padrao`. */
const coluna = (tabela: Map<string, string>, padrao: RegExp): string | undefined => {
  for (const [cabecalho, valor] of tabela) {
    if (padrao.test(cabecalho)) {
      return valor;
    }
  }

  return undefined;
};

/** Valor numerico depois de um rotulo, dentro do texto da linha (`Qtde ...: 0.1960`). */
const numeroRotulado = (texto: string, padrao: RegExp): number | null => {
  const achado = padrao.exec(texto);
  return achado ? lerNumero(achado[1]) : null;
};

type LeituraItem = { item: ItemNotaFiscal } | { falha: string };

/** Uma linha da tabela de itens. */
const lerItem = (linha: string): LeituraItem | null => {
  const celulas = blocos(linha, 'td');

  if (celulas.length === 0) {
    return null;
  }

  const primeira = textoDoHtml(celulas[0]);
  const codigoAchado = /\(\s*c[óo]d(?:igo)?\.?\s*:\s*([^)]*?)\s*\)/i.exec(primeira);
  const h7 = /<h7\b[^>]*>([\s\S]*?)<\/h7\s*>/i.exec(celulas[0]);
  const descricao = h7 ? textoDoHtml(h7[1]) : primeira.replace(codigoAchado?.[0] ?? '', '').trim();

  const texto = celulas.map(textoDoHtml).join(' | ');
  const quantidade = numeroRotulado(texto, /qtde[^:|]*:\s*([^|]*)/i);
  const unidade = /\bun\s*:\s*([^|\s]+)/i.exec(texto)?.[1] ?? '';
  const total = numeroRotulado(texto, /valor\s+total[^:|]*:\s*([^|]*)/i);
  const unitario = numeroRotulado(texto, /(?:vl\.?|valor)\s*unit[^:|]*:\s*([^|]*)/i);

  if (!descricao || quantidade === null || quantidade <= 0 || total === null || total < 0) {
    return { falha: descricao || texto };
  }

  return {
    item: {
      codigo: codigoAchado?.[1] ? codigoAchado[1] : null,
      descricao,
      quantidade,
      unidade: unidade.toUpperCase(),
      valorUnitario: unitario !== null && unitario > 0 ? unitario : total / quantidade,
      valorTotal: total,
    },
  };
};

type ResumoNota = {
  quantidadeItens: number | null;
  valorItens: number | null;
  desconto: number | null;
  acrescimo: number | null;
  aPagar: number | null;
  pagos: (number | null)[];
  formas: string[];
  troco: number | null;
};

/** Pares rotulo/valor em `<strong>` depois da tabela de itens. */
const lerResumo = (html: string): ResumoNota => {
  const textos = blocos(html, 'strong').map(textoDoHtml);
  const resumo: ResumoNota = {
    quantidadeItens: null,
    valorItens: null,
    desconto: null,
    acrescimo: null,
    aPagar: null,
    pagos: [],
    formas: [],
    troco: null,
  };

  for (let indice = 0; indice < textos.length - 1; indice += 1) {
    const nome = rotulo(textos[indice]);
    const valor = textos[indice + 1];
    let consumiu = true;

    if (nome.startsWith('qtde')) {
      resumo.quantidadeItens = lerNumero(valor);
    } else if (nome.startsWith('valor total')) {
      resumo.valorItens = lerNumero(valor);
    } else if (nome.startsWith('desconto')) {
      resumo.desconto = lerNumero(valor);
    } else if (nome.startsWith('acrescimo') || nome.startsWith('outras despesas')) {
      resumo.acrescimo = lerNumero(valor);
    } else if (nome.startsWith('valor a pagar')) {
      resumo.aPagar = lerNumero(valor);
    } else if (nome.startsWith('valor pago')) {
      resumo.pagos.push(lerNumero(valor));
    } else if (nome.startsWith('forma de pagamento') || nome.startsWith('formas de pagamento')) {
      resumo.formas.push(valor);
    } else if (nome.startsWith('troco')) {
      resumo.troco = lerNumero(valor);
    } else {
      consumiu = false;
    }

    if (consumiu) {
      indice += 1;
    }
  }

  return resumo;
};

/** `04 - Cartão de Débito` vira codigo `04` e descricao `Cartão de Débito`. */
const lerPagamento = (texto: string, valor: number | null): PagamentoNotaFiscal => {
  const achado = /^(\d{2})\s*-\s*(.+)$/.exec(texto);

  return achado
    ? { codigo: achado[1], descricao: achado[2].trim(), valor }
    : { codigo: null, descricao: texto, valor };
};

/** Primeira chave de acesso valida que aparece numa celula da pagina. */
const chaveDaPagina = (html: string): string | null => {
  for (const celula of blocos(html, 'td')) {
    const texto = textoDoHtml(celula);

    // A chave formatada tem 44 caracteres e uns 15 separadores.
    if (texto.length >= 44 && texto.length <= 70) {
      const chave = lerChaveAcesso(limparChave(texto));

      if (chave) {
        return chave.chave;
      }
    }
  }

  return null;
};

/**
 * Caixas de mensagem de erro do PrimeFaces e do Bootstrap. O `text-danger`
 * fica de fora: costuma marcar so o "*" de campo obrigatorio.
 */
const MENSAGEM_DE_ERRO =
  /<(div|span|li|p)\b[^>]*class\s*=\s*["'][^"']*\b(ui-messages-error|ui-message-error|ui-growl-message-error|alert-danger)\b[^"']*["'][^>]*>([\s\S]*?)<\/\1\s*>/gi;

/** Sinais da tela de verificacao (Turnstile da Cloudflare e afins). */
const SINAIS_DE_VERIFICACAO =
  /cf-turnstile|challenges\.cloudflare\.com|turnstile|cf-chl-|g-recaptcha|h-captcha/i;

/** Mensagem que fala da verificacao, e nao da nota. */
const FALA_DA_VERIFICACAO = /captcha|verifica[cç][aã]o|rob[oô]|humano|turnstile/i;

/**
 * Textos das caixas de erro, sem repeticao: a caixa de fora contem o resumo e
 * o detalhe, que tambem casam sozinhos; fica so o texto que nao esta dentro de
 * outro.
 */
const mensagensDeErro = (html: string): string[] => {
  const mensagens = new Set<string>();

  for (const achado of html.matchAll(MENSAGEM_DE_ERRO)) {
    const texto = textoDoHtml(achado[3]);

    if (/[a-zà-ú]{3}/i.test(texto)) {
      mensagens.add(texto);
    }
  }

  const todas = [...mensagens];
  return todas.filter((texto) => !todas.some((outra) => outra !== texto && outra.includes(texto)));
};

/** Monta a nota a partir da pagina que tem a tabela de itens. */
const lerNota = (html: string, linhas: string[], fimDosItens: number): NotaFiscalLida => {
  const avisos: string[] = [];
  const itens: ItemNotaFiscal[] = [];

  linhas.forEach((linha, indice) => {
    const leitura = lerItem(linha);

    if (!leitura) {
      return;
    }

    if ('falha' in leitura) {
      avisos.push(`Não deu para ler o item ${indice + 1} (${leitura.falha.slice(0, 60)}).`);
      return;
    }

    itens.push(leitura.item);
  });

  // O resumo fica entre a tabela de itens e o acordeao das informacoes gerais.
  const depoisDosItens = html.slice(fimDosItens);
  const inicioAcordeao = depoisDosItens.search(/id\s*=\s*["']accordion["']/i);
  const resumo = lerResumo(
    inicioAcordeao >= 0 ? depoisDosItens.slice(0, inicioAcordeao) : depoisDosItens,
  );

  const tabelas = tabelasComCabecalho(html);
  const tabelaEmitente = tabelas.find(
    (tabela) => coluna(tabela, /cnpj/) !== undefined && coluna(tabela, /inscricao/) !== undefined,
  );
  const tabelaNota = tabelas.find(
    (tabela) => coluna(tabela, /^modelo$/) !== undefined && coluna(tabela, /emissao/) !== undefined,
  );

  // Sem a tabela do emitente, o nome do cabecalho e o "CNPJ: ..." logo abaixo dele.
  const nomeCabecalho = textoDoHtml(
    /<thead\b[^>]*>[\s\S]*?<h4\b[^>]*>([\s\S]*?)<\/h4\s*>/i.exec(html)?.[1] ?? '',
  );
  const cnpjCabecalho = /CNPJ\s*:\s*([0-9A-Za-z./-]+)/.exec(textoDoHtml(html))?.[1];

  const nome =
    (tabelaEmitente && coluna(tabelaEmitente, /nome|razao/)) || nomeCabecalho || 'Emitente';
  const cnpj = lerCnpj(tabelaEmitente && coluna(tabelaEmitente, /cnpj/)) ?? lerCnpj(cnpjCabecalho);

  const serie = tabelaNota ? lerNumero(coluna(tabelaNota, /^serie$/) ?? '') : null;
  const numero = tabelaNota ? lerNumero(coluna(tabelaNota, /^numero$/) ?? '') : null;

  const somaItens = somarCentavos(itens.map((item) => item.valorTotal));
  const valorItens = resumo.valorItens ?? somaItens;
  const desconto = Math.abs(resumo.desconto ?? 0);
  const acrescimo = Math.abs(resumo.acrescimo ?? 0);

  const pagos = resumo.pagos.filter((valor): valor is number => valor !== null);
  const valorPago =
    resumo.aPagar ??
    (pagos.length > 0
      ? somarCentavos(pagos) - Math.abs(resumo.troco ?? 0)
      : somarCentavos([valorItens, -desconto, acrescimo]));

  if (resumo.quantidadeItens !== null && resumo.quantidadeItens !== itens.length) {
    avisos.push(`A nota tem ${resumo.quantidadeItens} itens e ${itens.length} foram lidos.`);
  }

  const esperadoDosItens = somarCentavos([somaItens, -desconto, acrescimo]);

  if (!fechaComFolga(somaItens, valorItens)) {
    avisos.push(
      `A soma dos itens lidos (${toCurrency(somaItens)}) não fecha com o total da nota (${toCurrency(valorItens)}).`,
    );
  } else if (!fechaComFolga(esperadoDosItens, valorPago)) {
    avisos.push(
      `Os itens menos o desconto (${toCurrency(esperadoDosItens)}) não fecham com o valor pago (${toCurrency(valorPago)}).`,
    );
  }

  return {
    chave: chaveDaPagina(html),
    emitente: { nome, cnpj },
    dataEmissao: lerDataHora(tabelaNota && coluna(tabelaNota, /emissao/)),
    numero: numero !== null && Number.isInteger(numero) ? numero : null,
    serie: serie !== null && Number.isInteger(serie) ? serie : null,
    itens,
    valorItens,
    desconto,
    valorPago,
    pagamentos: resumo.formas.map((forma, indice) =>
      lerPagamento(forma, resumo.pagos[indice] ?? null),
    ),
    avisos,
  };
};

/**
 * Le a pagina que a WebView da consulta tem aberta.
 *
 * `chaveEsperada` e a do QR Code: se a pagina mostra outra chave, ela e de
 * outra nota e nao e lida. Ordem: a nota (tabela de itens com linhas), depois
 * as mensagens de erro da SEFAZ, depois os sinais da verificacao.
 */
export const interpretarPaginaNfceMg = (html: string, chaveEsperada?: string): PaginaNfce => {
  const limpo = semCodigo(html);
  const chave = chaveDaPagina(limpo);

  if (chave && chaveEsperada && chave !== chaveEsperada) {
    return { tipo: 'outra_nota', chave };
  }

  const tabelaItens = /<tbody\b[^>]*\bid\s*=\s*["']myTable["'][^>]*>([\s\S]*?)<\/tbody\s*>/i.exec(
    limpo,
  );

  if (tabelaItens) {
    const linhas = blocos(tabelaItens[1], 'tr');

    if (linhas.length > 0) {
      const fimDosItens = tabelaItens.index + tabelaItens[0].length;
      return { tipo: 'nota', nota: lerNota(limpo, linhas, fimDosItens) };
    }
  }

  const erros = mensagensDeErro(limpo);

  if (erros.length > 0) {
    return erros.some((mensagem) => FALA_DA_VERIFICACAO.test(mensagem))
      ? { tipo: 'verificacao' }
      : { tipo: 'nao_encontrada', mensagem: erros.join(' ') };
  }

  // Os sinais do widget ficam no `<script>` e nos atributos: olha o HTML inteiro.
  if (SINAIS_DE_VERIFICACAO.test(html)) {
    return { tipo: 'verificacao' };
  }

  return { tipo: 'desconhecida' };
};
