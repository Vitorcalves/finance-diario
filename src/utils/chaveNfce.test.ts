import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import {
  digitoVerificadorChave,
  ehPaginaDaSefazMg,
  hostHttps,
  lerChaveAcesso,
  lerQrCodeNfce,
  limparChave,
  urlConsultaMg,
  urlPermitidaNaConsulta,
} from './chaveNfce';

/** Cupom de verdade: Fundacao Arthur Bernardes, Vicosa, 13/11/2026, R$ 41,34. */
const CHAVE_REAL = '31261120320503001123650350001972781044038887';
const URL_REAL =
  'https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml?p=' +
  `${CHAVE_REAL}|2|1|1|a1098b0f543cfab0c1e12e35baac83e78965a550`;

/*
 * As chaves abaixo saem da real trocando um campo; o digito verificador foi
 * calculado a parte (script independente desta implementacao).
 */
/** Forma de emissao 9 (contingencia off-line). */
const CHAVE_CONTINGENCIA = '31261120320503001123650350001972789044038882';
/** UF 35 (SP). */
const CHAVE_SP = '35261120320503001123650350001972781044038886';
/** CNPJ alfanumerico (12.ABC.345/01DE-35, o exemplo da Receita). */
const CHAVE_CNPJ_LETRAS = '31261112ABC34501DE35650350001972781044038882';
/** Modelo 55 (NF-e, nao e cupom). */
const CHAVE_NFE = '31261120320503001123550350001972781044038884';

const qr = (p: string): string =>
  `https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml?p=${p}`;

describe('digitoVerificadorChave', () => {
  test('exemplo do Manual de Orientacao do Contribuinte', () => {
    assert.equal(digitoVerificadorChave('5206043300991100250655012000000780026730161'), 5);
  });

  test('cupom de verdade', () => {
    assert.equal(digitoVerificadorChave(CHAVE_REAL.slice(0, 43)), 7);
  });

  test('letra do CNPJ vale o ASCII menos 48', () => {
    assert.equal(digitoVerificadorChave(CHAVE_CNPJ_LETRAS.slice(0, 43)), 2);
  });
});

describe('lerChaveAcesso', () => {
  test('separa os campos da chave', () => {
    assert.deepEqual(lerChaveAcesso(CHAVE_REAL), {
      chave: CHAVE_REAL,
      uf: '31',
      anoMes: '2611',
      cnpj: '20320503001123',
      modelo: '65',
      serie: 35,
      numero: 197278,
      formaEmissao: '1',
      codigo: '04403888',
      digito: 7,
    });
  });

  test('digito errado, tamanho errado ou letra fora do CNPJ', () => {
    assert.equal(lerChaveAcesso(`${CHAVE_REAL.slice(0, 43)}8`), null);
    assert.equal(lerChaveAcesso(CHAVE_REAL.slice(0, 43)), null);
    assert.equal(lerChaveAcesso(`A${CHAVE_REAL.slice(1)}`), null);
    assert.equal(lerChaveAcesso(CHAVE_REAL.toLowerCase().replace('2032', 'ab32')), null);
  });

  test('CNPJ com letras', () => {
    assert.equal(lerChaveAcesso(CHAVE_CNPJ_LETRAS)?.cnpj, '12ABC34501DE35');
  });
});

describe('limparChave', () => {
  test('a chave formatada da pagina da SEFAZ volta aos 44 caracteres', () => {
    assert.equal(
      limparChave('31-26/11-20.320.503/0011-23-65-035-000.197.278-104.403.8887'),
      CHAVE_REAL,
    );
  });
});

describe('lerQrCodeNfce', () => {
  test('QR Code versao 2 de verdade', () => {
    const leitura = lerQrCodeNfce(URL_REAL);
    assert.equal(leitura.ok, true);

    if (leitura.ok) {
      assert.equal(leitura.qrCode.chave.chave, CHAVE_REAL);
      assert.equal(leitura.qrCode.versao, 2);
      assert.equal(leitura.qrCode.contingencia, null);
      assert.equal(
        leitura.qrCode.p,
        `${CHAVE_REAL}|2|1|1|a1098b0f543cfab0c1e12e35baac83e78965a550`,
      );
    }
  });

  test('QR Code versao 3 (sem CSC)', () => {
    const leitura = lerQrCodeNfce(qr(`${CHAVE_REAL}|3|1`));
    assert.equal(leitura.ok && leitura.qrCode.versao, 3);
  });

  test('aceita o | codificado na URL e espacos em volta', () => {
    const leitura = lerQrCodeNfce(`  ${qr(`${CHAVE_REAL}%7C3%7C1`)}\n`);
    assert.equal(leitura.ok && leitura.qrCode.p, `${CHAVE_REAL}|3|1`);
  });

  test('aceita o parametro p sozinho', () => {
    assert.equal(lerQrCodeNfce(`${CHAVE_REAL}|3|1`).ok, true);
  });

  test('contingencia versao 2: dia e valor do proprio QR Code', () => {
    const leitura = lerQrCodeNfce(
      qr(
        `${CHAVE_CONTINGENCIA}|2|1|13|41.34|6c4b2f5a3d|1|a1098b0f543cfab0c1e12e35baac83e78965a550`,
      ),
    );
    assert.equal(leitura.ok, true);
    assert.deepEqual(leitura.ok && leitura.qrCode.contingencia, {
      data: '2026-11-13',
      valor: 41.34,
    });
  });

  test('contingencia versao 3: a assinatura Base64 com + chega inteira na URL', () => {
    const assinatura = 'MEUCIQ+abc/def==';
    const leitura = lerQrCodeNfce(
      qr(`${CHAVE_CONTINGENCIA}|3|1|5|152.3|2|12345678909|${assinatura}`),
    );
    assert.equal(leitura.ok, true);

    if (leitura.ok) {
      assert.deepEqual(leitura.qrCode.contingencia, { data: '2026-11-05', valor: 152.3 });
      assert.ok(leitura.qrCode.p.endsWith(assinatura));
      assert.ok(urlConsultaMg(leitura.qrCode.p).includes('MEUCIQ%2Babc%2Fdef%3D%3D'));
    }
  });

  test('contingencia com dia que nao existe no mes fica sem data e valor', () => {
    const leitura = lerQrCodeNfce(qr(`${CHAVE_CONTINGENCIA}|3|1|31|10.00|2|1|x`));
    assert.equal(leitura.ok && leitura.qrCode.contingencia, null);
  });

  test('digito errado', () => {
    const leitura = lerQrCodeNfce(qr(`${CHAVE_REAL.slice(0, 43)}1|2|1|1|abc`));
    assert.equal(!leitura.ok && leitura.erro, 'chave_invalida');
  });

  test('outro estado, com a sigla na mensagem', () => {
    const leitura = lerQrCodeNfce(qr(`${CHAVE_SP}|2|1|1|abc`));
    assert.equal(!leitura.ok && leitura.erro, 'outro_estado');
    assert.equal(
      !leitura.ok && leitura.mensagem,
      'Por enquanto só notas de Minas Gerais; esta é de SP.',
    );
  });

  test('nota de teste (homologacao)', () => {
    const leitura = lerQrCodeNfce(qr(`${CHAVE_REAL}|2|2|1|abc`));
    assert.equal(!leitura.ok && leitura.erro, 'teste');
  });

  test('versao que o app nao conhece', () => {
    const leitura = lerQrCodeNfce(qr(`${CHAVE_REAL}|1|1|1|abc`));
    assert.equal(!leitura.ok && leitura.erro, 'versao');
  });

  test('CNPJ com letras passa', () => {
    const leitura = lerQrCodeNfce(qr(`${CHAVE_CNPJ_LETRAS}|3|1`));
    assert.equal(leitura.ok && leitura.qrCode.chave.cnpj, '12ABC34501DE35');
  });

  test('texto que nao e nota', () => {
    for (const texto of [
      '',
      'https://www.google.com',
      '7891234567895',
      CHAVE_REAL,
      qr(`${CHAVE_REAL}`),
      qr(`${CHAVE_NFE}|2|1|1|abc`),
      qr(`${CHAVE_REAL}|2|1|1|<script>`),
      qr(`${CHAVE_REAL}|2|1|${'a'.repeat(1300)}`),
    ]) {
      const leitura = lerQrCodeNfce(texto);
      assert.equal(!leitura.ok && leitura.erro, 'nao_e_nota', texto.slice(0, 80));
    }
  });
});

describe('urlConsultaMg', () => {
  test('monta a URL oficial com o p codificado', () => {
    assert.equal(
      urlConsultaMg(`${CHAVE_REAL}|3|1`),
      `https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml?p=${CHAVE_REAL}%7C3%7C1`,
    );
  });
});

describe('navegacao da consulta', () => {
  test('host de URL https', () => {
    assert.equal(
      hostHttps('https://PortalSped.Fazenda.MG.gov.br:443/x'),
      'portalsped.fazenda.mg.gov.br',
    );
    assert.equal(hostHttps('https://challenges.cloudflare.com'), 'challenges.cloudflare.com');
    assert.equal(hostHttps('http://portalsped.fazenda.mg.gov.br/'), null);
    assert.equal(hostHttps('https://portalsped.fazenda.mg.gov.br@outro.com/'), null);
    assert.equal(hostHttps('https://outro.com\\@portalsped.fazenda.mg.gov.br/'), null);
  });

  test('so a SEFAZ-MG, o Turnstile e as paginas internas do widget', () => {
    assert.equal(urlPermitidaNaConsulta(urlConsultaMg(`${CHAVE_REAL}|3|1`)), true);
    assert.equal(
      urlPermitidaNaConsulta(
        'https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/infoqrcode.xhtml',
      ),
      true,
    );
    assert.equal(
      urlPermitidaNaConsulta('https://challenges.cloudflare.com/cdn-cgi/challenge-platform/x'),
      true,
    );
    assert.equal(urlPermitidaNaConsulta('about:blank'), true);
    assert.equal(urlPermitidaNaConsulta('about:srcdoc'), true);

    assert.equal(urlPermitidaNaConsulta('https://www.fazenda.mg.gov.br/'), false);
    assert.equal(urlPermitidaNaConsulta('https://portalsped.fazenda.mg.gov.br.evil.com/'), false);
    assert.equal(urlPermitidaNaConsulta('http://portalsped.fazenda.mg.gov.br/'), false);
    assert.equal(urlPermitidaNaConsulta('intent://scan/#Intent;scheme=zxing;end'), false);
    assert.equal(urlPermitidaNaConsulta('javascript:alert(1)'), false);
    assert.equal(urlPermitidaNaConsulta('about:config'), false);
  });

  test('o HTML so vale vindo da propria SEFAZ-MG', () => {
    assert.equal(
      ehPaginaDaSefazMg('https://portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml'),
      true,
    );
    assert.equal(ehPaginaDaSefazMg('https://challenges.cloudflare.com/x'), false);
    assert.equal(ehPaginaDaSefazMg('about:blank'), false);
  });
});
