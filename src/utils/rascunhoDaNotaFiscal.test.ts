import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { lerQrCodeNfce, type QrCodeNfce } from './chaveNfce';
import { interpretarPaginaNfceMg, type NotaFiscalLida } from './paginaNfceMg';
import {
  acharEmpresaDaNota,
  cadastroDaNota,
  type CatalogoNotaFiscal,
  chaveDoItemNota,
  contaDoPagamento,
  formatarCnpj,
  normalizarCnpj,
  quantidadeFracionada,
  rascunhoDaChave,
  rascunhoDaNotaFiscal,
  ratearDesconto,
} from './rascunhoDaNotaFiscal';

const CHAVE_REAL = '31261120320503001123650350001972781044038887';

const qrCode = (p: string): QrCodeNfce => {
  const leitura = lerQrCodeNfce(p);
  assert.ok(leitura.ok);
  return leitura.qrCode;
};

const QR_REAL = qrCode(`${CHAVE_REAL}|2|1|1|a1098b0f543cfab0c1e12e35baac83e78965a550`);

const NOTA_REAL = ((): NotaFiscalLida => {
  const html = readFileSync(
    resolve(__dirname, '../../tests/fixtures/nfce/mg-itens-por-peso.html'),
    'utf8',
  );
  const pagina = interpretarPaginaNfceMg(html, CHAVE_REAL);
  assert.equal(pagina.tipo, 'nota');
  return pagina.nota;
})();

const FUNARBE = { id: 'funarbe', nome: 'Funarbe', cnpj: '20.320.503/0011-23' };

const catalogo = (extra: Partial<CatalogoNotaFiscal> = {}): CatalogoNotaFiscal => ({
  empresas: [FUNARBE, { id: 'bahamas', nome: 'Bahamas', cnpj: null }],
  categorias: [
    { id: 'mercado', tipo: 'saida' },
    { id: 'salario', tipo: 'entrada' },
  ],
  categoriaPorEmpresa: new Map([['funarbe', 'mercado']]),
  categoriasDaEmpresa: new Map(),
  produtos: [{ id: 'queijo' }, { id: 'bacon' }],
  variantes: [
    { id: 'queijo-tirolez', produto_id: 'queijo', codigo_barras: null },
    { id: 'bacon-pedaco', produto_id: 'bacon', codigo_barras: '7891234567895' },
  ],
  dePara: [],
  contas: [
    { id: 'caixa', tipo: 'caixa' },
    { id: 'nubank', tipo: 'cartao' },
  ],
  ...extra,
});

/** Total que o formulario calcula: cada linha arredondada ao centavo. */
const totalDoFormulario = (itens: { quantidade: number; precoUnitario: number }[]): number =>
  itens.reduce((soma, item) => soma + Math.round(item.quantidade * item.precoUnitario * 100), 0) /
  100;

describe('CNPJ', () => {
  test('normaliza sem perder as letras do CNPJ novo', () => {
    assert.equal(normalizarCnpj('12.abc.345/01de-35'), '12ABC34501DE35');
    assert.equal(normalizarCnpj(null), '');
  });

  test('formata com pontuacao', () => {
    assert.equal(formatarCnpj('20320503001123'), '20.320.503/0011-23');
    assert.equal(formatarCnpj('123'), '123');
  });
});

describe('acharEmpresaDaNota', () => {
  const empresas = [
    { id: 'sem', nome: 'Sem CNPJ' },
    { id: 'matriz', nome: 'Matriz', cnpj: '20.320.503/0001-51' },
    FUNARBE,
    { id: 'letras', nome: 'Nova', cnpj: '12.ABC.345/01DE-35' },
  ];

  test('mesmo CNPJ, com ou sem pontuacao no cadastro', () => {
    assert.deepEqual(acharEmpresaDaNota('20320503001123', empresas), {
      empresa: FUNARBE,
      como: 'cnpj',
    });
    assert.equal(acharEmpresaDaNota('12ABC34501DE35', empresas)?.empresa.id, 'letras');
  });

  test('mesma raiz: outra filial', () => {
    assert.deepEqual(acharEmpresaDaNota('20320503009999', [empresas[0], empresas[1]]), {
      empresa: empresas[1],
      como: 'raiz',
    });
  });

  test('nenhuma', () => {
    assert.equal(acharEmpresaDaNota('99999999000191', empresas), null);
    assert.equal(acharEmpresaDaNota('', empresas), null);
  });
});

describe('cadastroDaNota', () => {
  test('emitente novo: cadastrar com o CNPJ formatado', () => {
    assert.deepEqual(cadastroDaNota('Fundacao Arthur Bernardes', '20320503001123', []), {
      tipo: 'cadastrar',
      nome: 'Fundacao Arthur Bernardes',
      cnpj: '20.320.503/0011-23',
    });
  });

  test('mesmo nome sem CNPJ: gravar o CNPJ na empresa que ja existe', () => {
    const bahamas = { id: 'bahamas', nome: 'BAHAMAS ', cnpj: '' };
    assert.deepEqual(cadastroDaNota('Bahamas', '20320503001123', [bahamas]), {
      tipo: 'gravar_cnpj',
      empresa: bahamas,
      cnpj: '20.320.503/0011-23',
    });
  });

  test('mesmo nome com outro CNPJ: o nome novo leva o CNPJ', () => {
    const outra = { id: 'outra', nome: 'Bahamas', cnpj: '11.111.111/0001-91' };
    assert.deepEqual(cadastroDaNota('Bahamas', '20320503001123', [outra]), {
      tipo: 'cadastrar',
      nome: 'Bahamas (20.320.503/0011-23)',
      cnpj: '20.320.503/0011-23',
    });
  });
});

describe('chaveDoItemNota', () => {
  test('o codigo da nota ou a descricao normalizada', () => {
    assert.equal(chaveDoItemNota({ codigo: ' 3875 ', descricao: 'QUEIJO' }), 'codigo:3875');
    assert.equal(
      chaveDoItemNota({ codigo: null, descricao: ' Pão  de Açúcar ' }),
      'descricao:pao de acucar',
    );
    assert.equal(chaveDoItemNota({ codigo: '', descricao: 'PÃO' }), 'descricao:pao');
  });
});

describe('quantidadeFracionada', () => {
  test('peso, volume e medida, ou quantidade quebrada', () => {
    assert.equal(quantidadeFracionada('KG', 1), true);
    assert.equal(quantidadeFracionada(' lt ', 2), true);
    assert.equal(quantidadeFracionada('UN', 0.5), true);
    assert.equal(quantidadeFracionada('UN', 2), false);
    assert.equal(quantidadeFracionada('', 1), false);
  });
});

describe('ratearDesconto', () => {
  test('proporcional ao valor, sem perder centavo', () => {
    assert.deepEqual(ratearDesconto([300, 100, 1], 100), [225, 75, 1]);
    const pagos = ratearDesconto([2350, 1652, 132], 134);
    assert.deepEqual(pagos, [2274, 1598, 128]);
    assert.equal(
      pagos?.reduce((soma, pago) => soma + pago, 0),
      4134 - 134,
    );
  });

  test('sem desconto, os totais como estao', () => {
    assert.deepEqual(ratearDesconto([100, 200], 0), [100, 200]);
  });

  test('desconto do tamanho da compra nao cabe', () => {
    assert.equal(ratearDesconto([100, 200], 300), null);
    assert.equal(ratearDesconto([1, 1000], 999), null);
  });
});

describe('contaDoPagamento', () => {
  const contas = [
    { id: 'caixa', tipo: 'caixa' },
    { id: 'nubank', tipo: 'cartao' },
  ];
  const credito = { codigo: '03', descricao: 'Cartão de Crédito', valor: 10 };

  test('so credito e um cartao so: o cartao', () => {
    assert.equal(contaDoPagamento([credito], contas), 'nubank');
  });

  test('debito, pagamento misto ou dois cartoes: a conta padrao', () => {
    assert.equal(
      contaDoPagamento([{ codigo: '04', descricao: 'Cartão de Débito', valor: 10 }], contas),
      undefined,
    );
    assert.equal(
      contaDoPagamento([credito, { codigo: '17', descricao: 'PIX', valor: 5 }], contas),
      undefined,
    );
    assert.equal(
      contaDoPagamento([credito], [...contas, { id: 'inter', tipo: 'cartao' }]),
      undefined,
    );
    assert.equal(contaDoPagamento([], contas), undefined);
  });
});

describe('rascunhoDaNotaFiscal', () => {
  test('a nota real vira o rascunho do formulario', () => {
    const rascunho = rascunhoDaNotaFiscal(NOTA_REAL, QR_REAL, catalogo(), FUNARBE);

    assert.equal(rascunho.tipo, 'saida');
    assert.equal(rascunho.descricao, 'Funarbe');
    assert.equal(rascunho.data, '2026-11-13');
    assert.equal(rascunho.empresaId, 'funarbe');
    assert.equal(rascunho.categoriaId, 'mercado');
    assert.equal(rascunho.contaId, undefined);
    assert.equal(rascunho.chaveNfce, CHAVE_REAL);
    assert.equal(rascunho.valor, 41.34);
    assert.deepEqual(rascunho.avisos, []);
    assert.deepEqual(
      rascunho.itens?.map((item) => [item.descricao, item.quantidade, item.produtoId]),
      [
        ['QUEIJO TIROLEZ PARMESAO KG', 0.196, null],
        ['BACON NOVO SUINO PEDACO KG', 0.36, null],
        ['CEREJA IMPORT KG', 0.04, null],
      ],
    );
    assert.deepEqual(rascunho.itens?.[0].itemNota, {
      codigo: '3875',
      descricao: 'QUEIJO TIROLEZ PARMESAO KG',
      unidade: 'KG',
    });
    assert.equal(totalDoFormulario(rascunho.itens ?? []), 41.34);
  });

  test('o desconto e rateado e o total fecha com o valor pago', () => {
    const nota: NotaFiscalLida = { ...NOTA_REAL, desconto: 1.34, valorPago: 40 };
    const rascunho = rascunhoDaNotaFiscal(nota, QR_REAL, catalogo(), FUNARBE);
    const itens = rascunho.itens ?? [];

    assert.equal(totalDoFormulario(itens), 40);
    // O preco que vai ao historico e o pago: R$ 22,74 pelos 0,196 kg do queijo.
    assert.equal(Math.round(itens[0].quantidade * itens[0].precoUnitario * 100), 2274);
  });

  test('desconto que nao cabe fica de fora, com aviso', () => {
    const nota: NotaFiscalLida = { ...NOTA_REAL, desconto: 50, valorPago: 0 };
    const rascunho = rascunhoDaNotaFiscal(nota, QR_REAL, catalogo(), FUNARBE);

    assert.equal(totalDoFormulario(rascunho.itens ?? []), 41.34);
    assert.equal(rascunho.valor, undefined);
    assert.match(rascunho.avisos?.[0] ?? '', /^O desconto de R\$\s50,00 não coube nos itens/);
  });

  test('item sem valor fica de fora, com aviso', () => {
    const nota: NotaFiscalLida = {
      ...NOTA_REAL,
      itens: [...NOTA_REAL.itens, { ...NOTA_REAL.itens[2], descricao: 'SACOLA', valorTotal: 0 }],
    };
    const rascunho = rascunhoDaNotaFiscal(nota, QR_REAL, catalogo(), FUNARBE);

    assert.equal(rascunho.itens?.length, 3);
    assert.deepEqual(rascunho.avisos, ['Sem valor na nota, ficaram de fora: SACOLA.']);
  });

  test('o de-para da empresa liga o item ao produto e a variante', () => {
    const rascunho = rascunhoDaNotaFiscal(
      NOTA_REAL,
      QR_REAL,
      catalogo({
        dePara: [
          {
            empresa_id: 'funarbe',
            chave_item: 'codigo:3875',
            produto_id: 'queijo',
            variante_id: 'queijo-tirolez',
          },
          {
            empresa_id: 'funarbe',
            chave_item: 'codigo:845',
            produto_id: 'bacon',
            variante_id: null,
          },
          // De outra empresa: nao vale aqui.
          {
            empresa_id: 'bahamas',
            chave_item: 'codigo:14045',
            produto_id: 'queijo',
            variante_id: null,
          },
        ],
      }),
      FUNARBE,
    );

    assert.deepEqual(
      rascunho.itens?.map((item) => [item.produtoId, item.varianteId]),
      [
        ['queijo', 'queijo-tirolez'],
        ['bacon', null],
        [null, null],
      ],
    );
  });

  test('de-para para cadastro excluido e ignorado', () => {
    const rascunho = rascunhoDaNotaFiscal(
      NOTA_REAL,
      QR_REAL,
      catalogo({
        // `apagado` e `variante-apagada` nao estao entre os ativos do catalogo.
        dePara: [
          {
            empresa_id: 'funarbe',
            chave_item: 'codigo:3875',
            produto_id: 'apagado',
            variante_id: null,
          },
          {
            empresa_id: 'funarbe',
            chave_item: 'codigo:845',
            produto_id: 'bacon',
            variante_id: 'variante-apagada',
          },
        ],
      }),
      FUNARBE,
    );

    assert.deepEqual(
      rascunho.itens?.map((item) => item.produtoId),
      [null, null, null],
    );
  });

  test('sem de-para, o codigo de barras de uma variante ativa', () => {
    const nota: NotaFiscalLida = {
      ...NOTA_REAL,
      itens: [
        { ...NOTA_REAL.itens[1], codigo: '7891234567895' },
        // Codigo interno curto nao e codigo de barras, mesmo que bata.
        { ...NOTA_REAL.itens[0], codigo: '845' },
      ],
    };
    const rascunho = rascunhoDaNotaFiscal(
      nota,
      QR_REAL,
      catalogo({
        variantes: [
          { id: 'bacon-pedaco', produto_id: 'bacon', codigo_barras: '7891234567895' },
          { id: 'curto', produto_id: 'queijo', codigo_barras: '845' },
        ],
      }),
      null,
    );

    assert.deepEqual(
      rascunho.itens?.map((item) => [item.produtoId, item.varianteId]),
      [
        ['bacon', 'bacon-pedaco'],
        [null, null],
      ],
    );
  });

  test('sem empresa: a descricao e o emitente e nao ha categoria', () => {
    const rascunho = rascunhoDaNotaFiscal(NOTA_REAL, QR_REAL, catalogo(), null);

    assert.equal(rascunho.descricao, 'Fundacao Arthur Bernardes');
    assert.equal(rascunho.empresaId, null);
    assert.equal(rascunho.categoriaId, null);
  });

  test('pago no credito com um cartao so: o cartao', () => {
    const nota: NotaFiscalLida = {
      ...NOTA_REAL,
      pagamentos: [{ codigo: '03', descricao: 'Cartão de Crédito', valor: 41.34 }],
    };
    assert.equal(rascunhoDaNotaFiscal(nota, QR_REAL, catalogo(), FUNARBE).contaId, 'nubank');
  });
});

describe('rascunhoDaChave', () => {
  test('nota normal: so a empresa e a chave', () => {
    assert.deepEqual(rascunhoDaChave(QR_REAL, catalogo(), FUNARBE), {
      tipo: 'saida',
      descricao: 'Funarbe',
      valor: undefined,
      data: undefined,
      empresaId: 'funarbe',
      categoriaId: 'mercado',
      chaveNfce: CHAVE_REAL,
    });
  });

  test('contingencia: o dia e o valor do QR Code', () => {
    const qr = qrCode(
      '31261120320503001123650350001972789044038882|2|1|13|41.34|6c4b|1|a1098b0f543cfab0c1e12e35baac83e78965a550',
    );
    const rascunho = rascunhoDaChave(qr, catalogo(), null);

    assert.equal(rascunho.data, '2026-11-13');
    assert.equal(rascunho.valor, 41.34);
    assert.equal(rascunho.empresaId, null);
    assert.equal(rascunho.descricao, undefined);
  });
});
