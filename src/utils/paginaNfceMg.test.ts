import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  decodificarEntidades,
  interpretarPaginaNfceMg,
  lerNumero,
  type NotaFiscalLida,
  type PaginaNfce,
  textoDoHtml,
} from './paginaNfceMg';

/** Pagina real salva do navegador (Ctrl+S) depois da verificacao; sem CPF na nota. */
const PAGINA_REAL = readFileSync(
  resolve(__dirname, '../../tests/fixtures/nfce/mg-itens-por-peso.html'),
  'utf8',
);
const CHAVE_REAL = '31261120320503001123650350001972781044038887';

const nota = (pagina: PaginaNfce): NotaFiscalLida => {
  assert.equal(pagina.tipo, 'nota');
  return pagina.nota;
};

/** Par rotulo/valor do resumo, no formato da pagina de MG. */
const linhaResumo = (rotulo: string, valor: string): string =>
  `<div class="row"><div class="col-xs-4"><strong>${rotulo}</strong></div>` +
  `<div class="col-lg-2"><strong>${valor}</strong></div></div>`;

/** Poe linhas no resumo, logo antes do acordeao das informacoes gerais. */
const comResumo = (html: string, ...linhas: string[]): string =>
  html.replace('<div id="accordion"', `${linhas.join('')}<div id="accordion"`);

/** Troca o valor pago (41.34) da pagina real. */
const comValorPago = (html: string, valor: string): string =>
  html.replace(/(Valor pago R\$\s*<\/strong>[\s\S]*?<strong>)41\.34/, `$1${valor}`);

describe('interpretarPaginaNfceMg com a pagina real', () => {
  test('le a nota inteira', () => {
    assert.deepEqual(nota(interpretarPaginaNfceMg(PAGINA_REAL, CHAVE_REAL)), {
      chave: CHAVE_REAL,
      emitente: { nome: 'Fundacao Arthur Bernardes', cnpj: '20320503001123' },
      dataEmissao: '2026-11-13T12:36:31',
      numero: 197278,
      serie: 35,
      itens: [
        {
          codigo: '3875',
          descricao: 'QUEIJO TIROLEZ PARMESAO KG',
          quantidade: 0.196,
          unidade: 'KG',
          valorUnitario: 23.5 / 0.196,
          valorTotal: 23.5,
        },
        {
          codigo: '845',
          descricao: 'BACON NOVO SUINO PEDACO KG',
          quantidade: 0.36,
          unidade: 'KG',
          valorUnitario: 16.52 / 0.36,
          valorTotal: 16.52,
        },
        {
          codigo: '14045',
          descricao: 'CEREJA IMPORT KG',
          quantidade: 0.04,
          unidade: 'KG',
          valorUnitario: 1.32 / 0.04,
          valorTotal: 1.32,
        },
      ],
      valorItens: 41.34,
      desconto: 0,
      valorPago: 41.34,
      pagamentos: [{ codigo: '04', descricao: 'Cartão de Débito', valor: 41.34 }],
      avisos: [],
    });
  });

  test('sem a chave do QR Code para comparar, le do mesmo jeito', () => {
    assert.equal(nota(interpretarPaginaNfceMg(PAGINA_REAL)).itens.length, 3);
  });

  test('pagina de outra nota nao e lida', () => {
    const outra = '31261120320503001123650350001972789044038882';
    assert.deepEqual(interpretarPaginaNfceMg(PAGINA_REAL, outra), {
      tipo: 'outra_nota',
      chave: CHAVE_REAL,
    });
  });
});

describe('interpretarPaginaNfceMg com variacoes da pagina real', () => {
  test('desconto, valor a pagar e troco', () => {
    const html = comResumo(
      comValorPago(PAGINA_REAL, '50.00'),
      linhaResumo('Descontos R$', '1.34'),
      linhaResumo('Valor a pagar R$', '40.00'),
      linhaResumo('Troco R$', '10.00'),
    );
    const lida = nota(interpretarPaginaNfceMg(html, CHAVE_REAL));

    assert.equal(lida.valorItens, 41.34);
    assert.equal(lida.desconto, 1.34);
    assert.equal(lida.valorPago, 40);
    assert.deepEqual(lida.avisos, []);
  });

  test('sem "Valor a pagar": o pago menos o troco', () => {
    const html = comResumo(comValorPago(PAGINA_REAL, '50.00'), linhaResumo('Troco R$', '8.66'));
    const lida = nota(interpretarPaginaNfceMg(html));

    assert.equal(lida.valorPago, 41.34);
    assert.deepEqual(lida.avisos, []);
  });

  test('dois pagamentos', () => {
    const html = comResumo(
      comValorPago(PAGINA_REAL, '31.34'),
      linhaResumo('Valor pago R$', '10.00'),
      linhaResumo('Forma de Pagamento', '<div id="x:1">17 - PIX</div>'),
    );
    const lida = nota(interpretarPaginaNfceMg(html));

    assert.deepEqual(lida.pagamentos, [
      { codigo: '04', descricao: 'Cartão de Débito', valor: 31.34 },
      { codigo: '17', descricao: 'PIX', valor: 10 },
    ]);
    assert.equal(lida.valorPago, 41.34);
    assert.deepEqual(lida.avisos, []);
  });

  test('soma dos itens que nao fecha vira aviso, sem mexer nos valores', () => {
    const lida = nota(interpretarPaginaNfceMg(PAGINA_REAL.replace('R$ 23,50', 'R$ 23,60')));

    assert.equal(lida.itens[0].valorTotal, 23.6);
    assert.equal(lida.valorItens, 41.34);
    assert.equal(lida.avisos.length, 1);
    assert.match(
      lida.avisos[0],
      /^A soma dos itens lidos \(R\$\s41,44\) não fecha com o total da nota/,
    );
  });

  test('itens menos desconto que nao fecham com o valor pago', () => {
    const html = comResumo(PAGINA_REAL, linhaResumo('Descontos R$', '2.00'));
    const lida = nota(interpretarPaginaNfceMg(html));

    assert.equal(lida.valorPago, 41.34);
    assert.equal(lida.avisos.length, 1);
    assert.match(lida.avisos[0], /^Os itens menos o desconto \(R\$\s39,34\) não fecham/);
  });

  test('linha que nao se le fica de fora, com aviso', () => {
    const lida = nota(
      interpretarPaginaNfceMg(PAGINA_REAL.replace('Qtde total de ítens: 0.0400', '')),
    );

    assert.deepEqual(
      lida.itens.map((item) => item.codigo),
      ['3875', '845'],
    );
    assert.equal(lida.avisos[0], 'Não deu para ler o item 3 (CEREJA IMPORT KG).');
    assert.equal(lida.avisos[1], 'A nota tem 3 itens e 2 foram lidos.');
    assert.equal(lida.avisos.length, 3);
  });

  test('entidades na descricao e valor unitario quando a pagina traz', () => {
    const html = PAGINA_REAL.replace('CEREJA IMPORT KG', 'CEREJA &amp; UVA').replace(
      /<td>UN: KG<\/td>\s*<td>Valor total R\$: R\$ 1,32<\/td>/,
      '<td>UN: KG</td><td>Vl. Unit.: 33,10</td><td>Valor total R$: R$ 1,32</td>',
    );
    const cereja = nota(interpretarPaginaNfceMg(html)).itens[2];

    assert.equal(cereja.descricao, 'CEREJA & UVA');
    assert.equal(cereja.valorUnitario, 33.1);
    assert.equal(cereja.valorTotal, 1.32);
  });
});

describe('interpretarPaginaNfceMg com outras paginas', () => {
  test('tela da verificacao (Turnstile)', () => {
    const html =
      '<html><body><form id="formPrincipal"><div class="cf-turnstile" data-sitekey="0x4"></div>' +
      '<button>Visualizar</button></form>' +
      '<script src="https://challenges.cloudflare.com/turnstile/v0/api.js"></script></body></html>';

    assert.deepEqual(interpretarPaginaNfceMg(html), { tipo: 'verificacao' });
  });

  test('erro da verificacao continua sendo verificacao', () => {
    const html =
      '<div class="ui-messages-error ui-corner-all"><span class="ui-messages-error-summary">' +
      'Falha na verificação do captcha</span></div>';

    assert.deepEqual(interpretarPaginaNfceMg(html), { tipo: 'verificacao' });
  });

  test('nota nao encontrada, com a mensagem da SEFAZ', () => {
    const html =
      '<form><div class="ui-messages-error ui-corner-all"><span class="ui-messages-error-icon"></span>' +
      '<span class="ui-messages-error-summary">NFC-e n&atilde;o encontrada.</span> ' +
      '<span class="ui-messages-error-detail">Verifique a chave.</span></div>' +
      '<span class="text-danger">*</span></form>';

    assert.deepEqual(interpretarPaginaNfceMg(html), {
      tipo: 'nao_encontrada',
      mensagem: 'NFC-e não encontrada. Verifique a chave.',
    });
  });

  test('layout desconhecido', () => {
    assert.deepEqual(interpretarPaginaNfceMg('<html><body><h1>Manutenção</h1></body></html>'), {
      tipo: 'desconhecida',
    });
    assert.deepEqual(interpretarPaginaNfceMg(''), { tipo: 'desconhecida' });
  });

  test('tabela de itens vazia nao e nota', () => {
    const html = '<table><tbody id="myTable"></tbody></table><div class="cf-turnstile"></div>';
    assert.deepEqual(interpretarPaginaNfceMg(html), { tipo: 'verificacao' });
  });
});

describe('ajudantes do leitor', () => {
  test('lerNumero: virgula, ponto decimal e milhar', () => {
    assert.equal(lerNumero('R$ 23,50'), 23.5);
    assert.equal(lerNumero('41.34'), 41.34);
    assert.equal(lerNumero('0.1960'), 0.196);
    assert.equal(lerNumero('R$ 1.234,56'), 1234.56);
    assert.equal(lerNumero('1.234.567'), 1234567);
    assert.equal(lerNumero('3'), 3);
    assert.equal(lerNumero('-2,00'), -2);
    assert.equal(lerNumero('sem numero'), null);
  });

  test('entidades com nome, acentuadas e numericas', () => {
    assert.equal(
      decodificarEntidades('P&atilde;o &amp; Caf&eacute; &Ccedil;&#227;&#xE9;'),
      'Pão & Café Çãé',
    );
    assert.equal(decodificarEntidades('&naoexiste; &#0;'), '&naoexiste; &#0;');
  });

  test('textoDoHtml tira as tags antes de decodificar', () => {
    assert.equal(textoDoHtml('<b>A</b>\n\t &lt;b&gt;&nbsp;B '), 'A <b> B');
  });
});
