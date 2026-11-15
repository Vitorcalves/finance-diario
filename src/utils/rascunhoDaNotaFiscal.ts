import { chaveDoNome } from '../models/nomeRepetido';
import type { ItemLancamento, RascunhoLancamento } from '../views/Home/types';
import { normalizarTexto } from './busca';
import type { QrCodeNfce } from './chaveNfce';
import { sugerirCategoriaDaEmpresa } from './empresasPorCategoria';
import { toCurrency } from './format';
import type { ItemNotaFiscal, NotaFiscalLida, PagamentoNotaFiscal } from './paginaNfceMg';

/**
 * Da nota fiscal lida (QR Code + pagina da SEFAZ) para o rascunho que o
 * formulario de lancamento abre para conferir. Modulo puro: o catalogo chega
 * pronto, e a tela decide o que gravar (empresa nova, CNPJ).
 */

/** Empresa como o rascunho compara: o cadastro pode ter o CNPJ com ou sem pontuacao. */
export type EmpresaDaNota = { id: string; nome: string; cnpj?: string | null };

/** Linha do de-para dos itens de nota (`nfce_itens_variantes`). */
export type DeParaDaNota = {
  empresa_id: string;
  chave_item: string;
  produto_id: string;
  variante_id: string | null;
};

export type CatalogoNotaFiscal = {
  /** Empresas ativas. */
  empresas: EmpresaDaNota[];
  categorias: { id: string; tipo: string }[];
  /** Categoria usada por ultimo em cada empresa. */
  categoriaPorEmpresa: Map<string, string>;
  /** Categorias vinculadas a cada empresa no cadastro. */
  categoriasDaEmpresa: Map<string, string[]>;
  /** Produtos e variantes ativos: de-para que aponta para excluido e ignorado. */
  produtos: { id: string }[];
  variantes: { id: string; produto_id: string; codigo_barras: string | null }[];
  /** De-para de todas as empresas. */
  dePara: DeParaDaNota[];
  /** Contas caixa e cartao ativas. */
  contas: { id: string; tipo: string }[];
};

/** CNPJ como e comparado: maiusculo e sem pontuacao. Nao usa `\D`: o CNPJ novo tem letras. */
export const normalizarCnpj = (cnpj: string | null | undefined): string =>
  (cnpj ?? '').toUpperCase().replace(/[^0-9A-Z]/g, '');

/** `20320503001123` vira `20.320.503/0011-23`; outro tamanho volta como veio. */
export const formatarCnpj = (cnpj: string): string => {
  const limpo = normalizarCnpj(cnpj);

  if (limpo.length !== 14) {
    return cnpj;
  }

  return `${limpo.slice(0, 2)}.${limpo.slice(2, 5)}.${limpo.slice(5, 8)}/${limpo.slice(8, 12)}-${limpo.slice(12)}`;
};

export type EmpresaAchada = {
  empresa: EmpresaDaNota;
  /** `raiz`: outra filial da mesma empresa (mesmos 8 primeiros caracteres). */
  como: 'cnpj' | 'raiz';
};

/**
 * Empresa do cadastro com o CNPJ da nota; senao, uma com a mesma raiz (os 8
 * primeiros caracteres: outra filial da mesma empresa); senao, `null`.
 */
export const acharEmpresaDaNota = (
  cnpj: string,
  empresas: EmpresaDaNota[],
): EmpresaAchada | null => {
  const alvo = normalizarCnpj(cnpj);

  if (alvo.length !== 14) {
    return null;
  }

  const mesma = empresas.find((empresa) => normalizarCnpj(empresa.cnpj) === alvo);

  if (mesma) {
    return { empresa: mesma, como: 'cnpj' };
  }

  const raiz = alvo.slice(0, 8);
  const filial = empresas.find((empresa) => {
    const outro = normalizarCnpj(empresa.cnpj);
    return outro.length === 14 && outro.slice(0, 8) === raiz;
  });

  return filial ? { empresa: filial, como: 'raiz' } : null;
};

export type CadastroDaNota =
  /** Cadastrar a empresa do emitente, ja com o CNPJ (formatado). */
  | { tipo: 'cadastrar'; nome: string; cnpj: string }
  /** A empresa com o nome do emitente existe e nao tem CNPJ: gravar nela. */
  | { tipo: 'gravar_cnpj'; empresa: EmpresaDaNota; cnpj: string };

/**
 * O que oferecer quando nenhuma empresa tem o CNPJ da nota. Mesmo nome e sem
 * CNPJ: gravar o CNPJ na empresa que ja existe. Mesmo nome com outro CNPJ (e
 * outra empresa): o cadastro novo leva o CNPJ no nome, porque o nome repetido
 * seria recusado. O nome e comparado como o cadastro compara (`chaveDoNome`).
 */
export const cadastroDaNota = (
  nomeEmitente: string,
  cnpj: string,
  empresas: EmpresaDaNota[],
): CadastroDaNota => {
  const cnpjFormatado = formatarCnpj(cnpj);
  const nome = nomeEmitente.trim() || `Empresa ${cnpjFormatado}`;
  const mesmoNome = empresas.find((empresa) => chaveDoNome(empresa.nome) === chaveDoNome(nome));

  if (!mesmoNome) {
    return { tipo: 'cadastrar', nome, cnpj: cnpjFormatado };
  }

  if (!normalizarCnpj(mesmoNome.cnpj)) {
    return { tipo: 'gravar_cnpj', empresa: mesmoNome, cnpj: cnpjFormatado };
  }

  return { tipo: 'cadastrar', nome: `${nome} (${cnpjFormatado})`, cnpj: cnpjFormatado };
};

/**
 * Chave do item no de-para: o codigo da nota (o do cadastro da loja) ou, sem
 * codigo, a descricao passada pelo `normalizarTexto`. O prefixo separa os dois
 * casos.
 */
export const chaveDoItemNota = (item: { codigo: string | null; descricao: string }): string => {
  const codigo = (item.codigo ?? '').trim().toUpperCase();

  return codigo
    ? `codigo:${codigo}`
    : `descricao:${normalizarTexto(item.descricao).replace(/\s+/g, ' ')}`;
};

/** Unidades da nota vendidas por peso, volume ou medida. */
const UNIDADES_FRACIONADAS = new Set([
  'KG',
  'G',
  'GR',
  'MG',
  'L',
  'LT',
  'ML',
  'M',
  'MT',
  'CM',
  'M2',
  'M3',
]);

/**
 * `true` quando o item da nota tem quantidade com casas decimais (0,196 kg):
 * unidade de peso, volume ou medida, ou quantidade que nao e inteira. O campo
 * de quantidade do item aceita entao 3 casas, mesmo sem variante a granel.
 */
export const quantidadeFracionada = (unidade: string, quantidade: number): boolean =>
  UNIDADES_FRACIONADAS.has(unidade.trim().toUpperCase()) || !Number.isInteger(quantidade);

/** Codigo com cara de codigo de barras (GTIN de 8, 12, 13 ou 14 digitos). */
const ehGtin = (codigo: string): boolean => /^(\d{8}|\d{12,14})$/.test(codigo);

/**
 * Divide o desconto entre os itens na proporcao do valor de cada um, sem perder
 * centavo (a ideia do `dividirEmParcelas`): os centavos que sobram do
 * arredondamento vao para os itens com a maior parte fracionaria, e no empate
 * para o primeiro. Recebe e devolve centavos: o valor pago de cada item.
 * `null` quando algum item ficaria sem valor (desconto do tamanho da compra).
 */
export const ratearDesconto = (totais: number[], desconto: number): number[] | null => {
  if (desconto <= 0) {
    return [...totais];
  }

  const soma = totais.reduce((acumulado, total) => acumulado + total, 0);

  if (soma <= 0 || desconto >= soma) {
    return null;
  }

  const partes = totais.map((total) => (desconto * total) / soma);
  const cotas = partes.map(Math.floor);
  let resto = desconto - cotas.reduce((acumulado, cota) => acumulado + cota, 0);

  const porFracao = partes
    .map((parte, indice) => ({ indice, fracao: parte - Math.floor(parte) }))
    .sort((a, b) => b.fracao - a.fracao || a.indice - b.indice);

  for (const { indice } of porFracao) {
    if (resto <= 0) {
      break;
    }

    cotas[indice] += 1;
    resto -= 1;
  }

  const pagos = totais.map((total, indice) => total - cotas[indice]);
  return pagos.every((pago) => pago > 0) ? pagos : null;
};

type Ligacao = { produtoId: string; varianteId: string | null };

/**
 * Liga cada item da nota a um produto: o de-para da empresa; depois o codigo da
 * nota igual ao `codigo_barras` de uma variante ativa (so codigo com cara de
 * GTIN: o codigo interno curto da loja nao e codigo de barras); senao, sem
 * produto. De-para que aponta para produto ou variante excluido e ignorado.
 */
const ligadorDeItens = (
  catalogo: CatalogoNotaFiscal,
  empresaId: string | null,
): ((item: ItemNotaFiscal) => Ligacao | null) => {
  const produtosAtivos = new Set(catalogo.produtos.map((produto) => produto.id));
  const variantesAtivas = new Map(catalogo.variantes.map((variante) => [variante.id, variante]));
  const dePara = new Map(
    catalogo.dePara
      .filter((linha) => linha.empresa_id === empresaId)
      .map((linha) => [linha.chave_item, linha]),
  );

  return (item) => {
    const aprendido = dePara.get(chaveDoItemNota(item));

    if (aprendido && produtosAtivos.has(aprendido.produto_id)) {
      if (aprendido.variante_id === null) {
        return { produtoId: aprendido.produto_id, varianteId: null };
      }

      const variante = variantesAtivas.get(aprendido.variante_id);

      if (variante && variante.produto_id === aprendido.produto_id) {
        return { produtoId: aprendido.produto_id, varianteId: variante.id };
      }
    }

    const codigo = (item.codigo ?? '').trim();

    if (ehGtin(codigo)) {
      const variante = catalogo.variantes.find(
        (candidata) =>
          (candidata.codigo_barras ?? '').trim() === codigo &&
          produtosAtivos.has(candidata.produto_id),
      );

      if (variante) {
        return { produtoId: variante.produto_id, varianteId: variante.id };
      }
    }

    return null;
  };
};

/** Codigo de "Cartão de Crédito" na forma de pagamento da NFC-e. */
const PAGAMENTO_CREDITO = '03';

/**
 * Conta sugerida pela forma de pagamento: pago so no credito e com um cartao
 * so cadastrado, o cartao. O resto fica com a conta padrao do formulario.
 */
export const contaDoPagamento = (
  pagamentos: PagamentoNotaFiscal[],
  contas: { id: string; tipo: string }[],
): string | undefined => {
  if (
    pagamentos.length === 0 ||
    !pagamentos.every((pagamento) => pagamento.codigo === PAGAMENTO_CREDITO)
  ) {
    return undefined;
  }

  const cartoes = contas.filter((conta) => conta.tipo === 'cartao');
  return cartoes.length === 1 ? cartoes[0].id : undefined;
};

const categoriaDa = (empresa: EmpresaDaNota | null, catalogo: CatalogoNotaFiscal): string | null =>
  empresa
    ? sugerirCategoriaDaEmpresa(
        empresa.id,
        'saida',
        catalogo.categorias,
        catalogo.categoriaPorEmpresa,
        catalogo.categoriasDaEmpresa,
      )
    : null;

/**
 * Rascunho do lancamento a partir da nota lida.
 *
 * - Empresa: a que a tela resolveu (achada pelo CNPJ ou cadastrada agora).
 *   Categoria: a sugerida pela empresa. Data: a de emissao. Descricao: o nome
 *   da empresa. Conta: a padrao (ou o cartao, no credito com um cartao so).
 * - Itens: um por linha da nota, com a descricao como veio, a quantidade e o
 *   preco unitario ja com a parte do desconto (o preco que vai ao historico e
 *   o pago). Item sem valor fica de fora: o formulario pede preco maior que zero.
 * - Desconto: rateado entre os itens, para o total fechar com o valor pago.
 * - `avisos`: os da leitura da pagina e os daqui.
 */
export const rascunhoDaNotaFiscal = (
  nota: NotaFiscalLida,
  qrCode: QrCodeNfce,
  catalogo: CatalogoNotaFiscal,
  empresa: EmpresaDaNota | null,
): RascunhoLancamento => {
  const avisos = [...nota.avisos];
  const comValor = nota.itens.filter((item) => Math.round(item.valorTotal * 100) > 0);
  const semValor = nota.itens.filter((item) => !comValor.includes(item));

  if (semValor.length > 0) {
    avisos.push(
      `Sem valor na nota, ficaram de fora: ${semValor.map((item) => item.descricao).join(', ')}.`,
    );
  }

  const totais = comValor.map((item) => Math.round(item.valorTotal * 100));
  let pagos = ratearDesconto(totais, Math.round(nota.desconto * 100));

  if (!pagos) {
    avisos.push(`O desconto de ${toCurrency(nota.desconto)} não coube nos itens e ficou de fora.`);
    pagos = totais;
  }

  const ligar = ligadorDeItens(catalogo, empresa?.id ?? null);
  const centavosPagos = pagos;

  const itens: Omit<ItemLancamento, 'localId'>[] = comValor.map((item, indice) => {
    const ligacao = ligar(item);

    return {
      produtoId: ligacao?.produtoId ?? null,
      varianteId: ligacao?.varianteId ?? null,
      descricao: item.descricao,
      quantidade: item.quantidade,
      // Sem arredondar: quantidade x preco tem de dar o centavo pago na linha.
      precoUnitario: centavosPagos[indice] / 100 / item.quantidade,
      itemNota: { codigo: item.codigo, descricao: item.descricao, unidade: item.unidade },
    };
  });

  const data = nota.dataEmissao?.slice(0, 10) ?? qrCode.contingencia?.data;

  return {
    tipo: 'saida',
    descricao: empresa?.nome ?? nota.emitente.nome,
    valor: nota.valorPago > 0 ? nota.valorPago : undefined,
    data,
    contaId: contaDoPagamento(nota.pagamentos, catalogo.contas),
    empresaId: empresa?.id ?? null,
    categoriaId: categoriaDa(empresa, catalogo),
    itens,
    chaveNfce: qrCode.chave.chave,
    avisos,
  };
};

/**
 * Rascunho so com o que o QR Code da ("Lançar sem os itens"): a empresa achada
 * pelo CNPJ da chave e, na nota em contingencia, o dia e o valor.
 */
export const rascunhoDaChave = (
  qrCode: QrCodeNfce,
  catalogo: CatalogoNotaFiscal,
  empresa: EmpresaDaNota | null,
): RascunhoLancamento => ({
  tipo: 'saida',
  descricao: empresa?.nome,
  valor: qrCode.contingencia?.valor,
  data: qrCode.contingencia?.data,
  empresaId: empresa?.id ?? null,
  categoriaId: categoriaDa(empresa, catalogo),
  chaveNfce: qrCode.chave.chave,
});
