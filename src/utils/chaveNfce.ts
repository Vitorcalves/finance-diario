/**
 * Chave de acesso e QR Code da NFC-e (cupom fiscal eletronico).
 *
 * Modulo puro: le o texto do QR Code, valida a chave de 44 caracteres e monta a
 * URL oficial de consulta. A tela de consulta (`ConsultaNfce`) so abre a URL
 * montada aqui, nunca o texto cru lido pela camera.
 */

/** Partes da chave de acesso (Manual de Orientacao do Contribuinte, NF-e e NFC-e). */
export type ChaveAcesso = {
  /** Os 44 caracteres, sem separadores. */
  chave: string;
  /** Codigo IBGE da UF do emitente (31 = MG). */
  uf: string;
  /** Ano e mes da emissao, `AAMM`. */
  anoMes: string;
  /** CNPJ do emitente: 14 caracteres, com letras desde julho de 2026. */
  cnpj: string;
  /** `65` = NFC-e; `55` = NF-e. */
  modelo: string;
  serie: number;
  numero: number;
  /** `1` = normal; `9` = contingencia off-line da NFC-e. */
  formaEmissao: string;
  codigo: string;
  digito: number;
};

/** O que o QR Code da NFC-e traz, ja validado. */
export type QrCodeNfce = {
  /** Parametro `p` remontado a partir dos campos validados. */
  p: string;
  chave: ChaveAcesso;
  versao: 2 | 3;
  /**
   * Nota emitida em contingencia (forma de emissao 9): o proprio QR Code traz
   * o dia da emissao e o valor total. `null` na nota normal ou quando os campos
   * nao se leem.
   */
  contingencia: { data: string; valor: number } | null;
};

export type ErroQrCodeNfce = 'nao_e_nota' | 'chave_invalida' | 'versao' | 'teste' | 'outro_estado';

export type LeituraQrCodeNfce =
  { ok: true; qrCode: QrCodeNfce } | { ok: false; erro: ErroQrCodeNfce; mensagem: string };

/** Host da consulta publica da SEFAZ-MG. */
export const HOST_CONSULTA_MG = 'portalsped.fazenda.mg.gov.br';

/** Codigo IBGE de Minas Gerais, os 2 primeiros caracteres da chave. */
export const UF_MG = '31';

/** Sigla de cada UF pelo codigo IBGE, para a mensagem de "outro estado". */
const SIGLAS_UF: Record<string, string> = {
  '11': 'RO',
  '12': 'AC',
  '13': 'AM',
  '14': 'RR',
  '15': 'PA',
  '16': 'AP',
  '17': 'TO',
  '21': 'MA',
  '22': 'PI',
  '23': 'CE',
  '24': 'RN',
  '25': 'PB',
  '26': 'PE',
  '27': 'AL',
  '28': 'SE',
  '29': 'BA',
  '31': 'MG',
  '32': 'ES',
  '33': 'RJ',
  '35': 'SP',
  '41': 'PR',
  '42': 'SC',
  '43': 'RS',
  '50': 'MS',
  '51': 'MT',
  '52': 'GO',
  '53': 'DF',
};

/** UF (6 digitos de UF e AAMM), CNPJ com letras (12) e o resto numerico (26). */
const FORMATO_CHAVE = /^\d{6}[0-9A-Z]{12}\d{26}$/;

/**
 * Caracteres que os campos do QR Code usam: digitos, letras, o ponto do valor
 * e o Base64 da assinatura (`+`, `/`, `=`). Qualquer outro recusa a leitura.
 */
const FORMATO_CAMPO = /^[0-9A-Za-z+/=.-]*$/;

/** Teto de tamanho do parametro `p` (a assinatura Base64 e o campo mais longo). */
const TAMANHO_MAXIMO_P = 1200;

/**
 * Digito verificador da chave: modulo 11 sobre os 43 primeiros caracteres,
 * com pesos de 2 a 9 da direita para a esquerda. Cada caractere vale o codigo
 * ASCII menos 48 (o digito vale ele mesmo; `A` vale 17, para o CNPJ com
 * letras). Resto 0 ou 1 da digito 0.
 */
export const digitoVerificadorChave = (base: string): number => {
  let soma = 0;
  let peso = 2;

  for (let posicao = base.length - 1; posicao >= 0; posicao -= 1) {
    soma += (base.charCodeAt(posicao) - 48) * peso;
    peso = peso === 9 ? 2 : peso + 1;
  }

  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
};

/** Le a chave de 44 caracteres; `null` se o formato ou o digito nao conferem. */
export const lerChaveAcesso = (texto: string): ChaveAcesso | null => {
  if (!FORMATO_CHAVE.test(texto)) {
    return null;
  }

  const digito = Number(texto[43]);

  if (digitoVerificadorChave(texto.slice(0, 43)) !== digito) {
    return null;
  }

  return {
    chave: texto,
    uf: texto.slice(0, 2),
    anoMes: texto.slice(2, 6),
    cnpj: texto.slice(6, 20),
    modelo: texto.slice(20, 22),
    serie: Number(texto.slice(22, 25)),
    numero: Number(texto.slice(25, 34)),
    formaEmissao: texto.slice(34, 35),
    codigo: texto.slice(35, 43),
    digito,
  };
};

/**
 * Chave escrita com separadores, como a pagina da SEFAZ mostra
 * (`31-26/11-20.320.503/0011-23-65-...`), reduzida aos 44 caracteres.
 */
export const limparChave = (texto: string): string => texto.toUpperCase().replace(/[^0-9A-Z]/g, '');

/** Valor do parametro `p` na URL do QR Code; aceita tambem o `p` sozinho. */
const extrairParametroP = (texto: string): string | null => {
  const limpo = texto.trim();
  const daUrl = /[?&]p=([^&#\s]*)/.exec(limpo);
  const bruto = daUrl ? daUrl[1] : /^[0-9A-Z]{44}(\||%7C)/i.test(limpo) ? limpo : null;

  if (bruto === null) {
    return null;
  }

  try {
    // `decodeURIComponent` nao troca `+` por espaco: o `+` da assinatura fica.
    return decodeURIComponent(bruto);
  } catch {
    return bruto;
  }
};

/** `AAMM` da chave + dia do QR Code em `YYYY-MM-DD`; `null` se a data nao existe. */
const dataDaContingencia = (anoMes: string, dia: string): string | null => {
  if (!/^\d{1,2}$/.test(dia)) {
    return null;
  }

  const ano = 2000 + Number(anoMes.slice(0, 2));
  const mes = Number(anoMes.slice(2, 4));
  const numeroDia = Number(dia);
  const data = new Date(Date.UTC(ano, mes - 1, numeroDia));

  if (data.getUTCMonth() !== mes - 1 || data.getUTCDate() !== numeroDia) {
    return null;
  }

  return `${ano}-${String(mes).padStart(2, '0')}-${String(numeroDia).padStart(2, '0')}`;
};

const falha = (erro: ErroQrCodeNfce, mensagem: string): LeituraQrCodeNfce => ({
  ok: false,
  erro,
  mensagem,
});

const NAO_E_NOTA = 'Este QR Code não é de nota fiscal de consumidor (NFC-e).';

/**
 * Le o texto do QR Code do cupom.
 *
 * O parametro `p` da URL e separado por `|`: o 1o campo e a chave, o 2o a
 * versao do QR Code (2 ou 3) e o 3o o ambiente. Na nota em contingencia
 * (forma de emissao 9), o 4o e o 5o campos sao o dia da emissao e o valor
 * total, nas duas versoes.
 *
 * So passa NFC-e (modelo 65) de producao (ambiente 1) de Minas Gerais; o resto
 * volta com o motivo pronto para mostrar.
 */
export const lerQrCodeNfce = (texto: string): LeituraQrCodeNfce => {
  const p = extrairParametroP(texto);

  if (p === null || p.length > TAMANHO_MAXIMO_P) {
    return falha('nao_e_nota', NAO_E_NOTA);
  }

  const campos = p.split('|');

  if (campos.length < 3 || !campos.every((campo) => FORMATO_CAMPO.test(campo))) {
    return falha('nao_e_nota', NAO_E_NOTA);
  }

  if (!FORMATO_CHAVE.test(campos[0])) {
    return falha('nao_e_nota', NAO_E_NOTA);
  }

  const chave = lerChaveAcesso(campos[0]);

  if (!chave) {
    return falha(
      'chave_invalida',
      'A chave de acesso deste QR Code não confere. Tente ler o cupom de novo.',
    );
  }

  if (chave.modelo !== '65') {
    return falha('nao_e_nota', NAO_E_NOTA);
  }

  const versao = campos[1];

  if (versao !== '2' && versao !== '3') {
    return falha('versao', `Versão do QR Code não suportada (${versao || 'sem versão'}).`);
  }

  if (campos[2] !== '1') {
    return falha('teste', 'Esta é uma nota de teste (homologação): não vale como compra.');
  }

  if (chave.uf !== UF_MG) {
    const sigla = SIGLAS_UF[chave.uf];
    return falha(
      'outro_estado',
      `Por enquanto só notas de Minas Gerais${sigla ? `; esta é de ${sigla}` : ''}.`,
    );
  }

  let contingencia: QrCodeNfce['contingencia'] = null;

  if (chave.formaEmissao === '9' && campos.length >= 5) {
    const data = dataDaContingencia(chave.anoMes, campos[3]);
    const valor = /^\d+(\.\d{1,2})?$/.test(campos[4]) ? Number(campos[4]) : NaN;

    if (data && valor > 0) {
      contingencia = { data, valor };
    }
  }

  return {
    ok: true,
    qrCode: { p: campos.join('|'), chave, versao: versao === '2' ? 2 : 3, contingencia },
  };
};

/**
 * URL oficial da consulta do QR Code em MG. O `p` vai codificado: a
 * assinatura da nota em contingencia e Base64 e pode ter `+`.
 */
export const urlConsultaMg = (p: string): string =>
  `https://${HOST_CONSULTA_MG}/portalnfce/sistema/qrcode.xhtml?p=${encodeURIComponent(p)}`;

/**
 * Host de uma URL `https`, em minusculas e sem a porta; `null` em outro
 * esquema. Feito a mao: o `URL` do React Native nao e o do navegador.
 *
 * So aceita host limpo (letras, digitos, `.` e `-`) seguido do fim, `/`, `?`
 * ou `#`. Endereco com usuario (`https://sefaz@outro.com`) ou com `\` (que o
 * navegador le como `/`) volta `null`: o host que o navegador abriria nao e o
 * que aparece no comeco do texto.
 */
export const hostHttps = (url: string): string | null => {
  const resultado = /^https:\/\/([a-z0-9.-]+)(?::\d+)?(?=[/?#]|$)/i.exec(url);
  return resultado ? resultado[1].toLowerCase() : null;
};

/** Hosts onde a tela de consulta pode navegar: a SEFAZ e o Turnstile da Cloudflare. */
const HOSTS_DA_CONSULTA = [HOST_CONSULTA_MG, 'challenges.cloudflare.com'];

/**
 * `true` quando a WebView da consulta pode abrir o endereço: a SEFAZ-MG, a
 * verificacao da Cloudflare e as paginas internas que o widget usa
 * (`about:blank`, `about:srcdoc`). Todo o resto fica bloqueado.
 */
export const urlPermitidaNaConsulta = (url: string): boolean => {
  if (/^about:(blank|srcdoc)([?#].*)?$/.test(url)) {
    return true;
  }

  const host = hostHttps(url);
  return host !== null && HOSTS_DA_CONSULTA.includes(host);
};

/** `true` quando a URL e uma pagina da propria SEFAZ-MG (de onde o HTML pode vir). */
export const ehPaginaDaSefazMg = (url: string): boolean => hostHttps(url) === HOST_CONSULTA_MG;
