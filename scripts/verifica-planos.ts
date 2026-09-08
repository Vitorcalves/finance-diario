/**
 * Verificacao da logica de parcelamento/assinatura fora do app.
 *
 * Roda o modulo puro (`utils/parcelas`) e o SQL real das migrations contra um
 * SQLite em memoria, com um shim da API do expo-sqlite.
 */
// @ts-expect-error - `node:sqlite` ainda nao tem tipos no @types/node instalado.
import { DatabaseSync as DatabaseSyncSemTipo } from 'node:sqlite';
import {
  custoMensalEquivalente,
  dataDaOcorrencia,
  dividirEmParcelas,
  ocorrenciasAte,
  parcelasDaCompra,
  proximaOcorrencia,
} from '../src/utils/parcelas';
import { migrations } from '../src/models/migrations';

type SqliteStatement = {
  run: (...params: unknown[]) => void;
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
};

type SqliteDatabase = {
  exec: (sql: string) => void;
  prepare: (sql: string) => SqliteStatement;
};

/** Superficie minima do `node:sqlite` usada aqui, para nao depender dos tipos. */
const DatabaseSync = DatabaseSyncSemTipo as new (caminho: string) => SqliteDatabase;

let falhas = 0;

const ok = (nome: string, condicao: boolean, detalhe?: unknown): void => {
  if (condicao) {
    console.log(`  ok   ${nome}`);
  } else {
    falhas += 1;
    console.log(`  FALHA ${nome}`, detalhe ?? '');
  }
};

const soma = (valores: number[]): number =>
  Math.round(valores.reduce((total, valor) => total + valor, 0) * 100) / 100;

console.log('\n== rateio de centavos ==');
ok('100 em 3x soma 100', soma(dividirEmParcelas(-100, 3)) === -100, dividirEmParcelas(-100, 3));
ok(
  '100 em 3x = 33.34/33.33/33.33',
  JSON.stringify(dividirEmParcelas(100, 3)) === '[33.34,33.33,33.33]',
  dividirEmParcelas(100, 3),
);
ok('1000 em 7x soma 1000', soma(dividirEmParcelas(1000, 7)) === 1000, dividirEmParcelas(1000, 7));
ok('0.05 em 3x soma 0.05', soma(dividirEmParcelas(0.05, 3)) === 0.05, dividirEmParcelas(0.05, 3));
ok('1234.56 em 12x soma 1234.56', soma(dividirEmParcelas(1234.56, 12)) === 1234.56);
ok(
  'sinal negativo preservado',
  dividirEmParcelas(-90, 3).every((v) => v < 0),
);

console.log('\n== calendario (ancora de fim de mes) ==');
ok('31/01 + 1 mes = 28/02', dataDaOcorrencia('2026-01-31', 'mensal', 1, 2) === '2026-02-28');
ok(
  '31/01 + 2 meses volta ao dia 31',
  dataDaOcorrencia('2026-01-31', 'mensal', 1, 3) === '2026-03-31',
);
ok('31/01 + 3 meses = 30/04', dataDaOcorrencia('2026-01-31', 'mensal', 1, 4) === '2026-04-30');
ok(
  '29/02 bissexto + 1 ano = 28/02',
  dataDaOcorrencia('2024-02-29', 'anual', 1, 2) === '2025-02-28',
);
ok('semanal anda 7 dias', dataDaOcorrencia('2026-09-08', 'semanal', 1, 3) === '2026-09-22');

console.log('\n== ocorrencias ==');
const doze = parcelasDaCompra(-1200, 12, '2026-01-31');
ok('12 parcelas geradas', doze.length === 12);
ok('ultima parcela em 31/12', doze[11].data === '2026-12-31', doze[11]);
ok('soma das parcelas = total', soma(doze.map((p) => p.valor)) === -1200);

const assinatura = ocorrenciasAte({
  dataInicio: '2026-01-10',
  frequencia: 'mensal',
  intervalo: 1,
  ateData: '2026-09-30',
});
ok('assinatura de jan ate set = 9 cobrancas', assinatura.length === 9, assinatura.length);
ok('nao passa do horizonte', assinatura[assinatura.length - 1].data === '2026-09-10');

const comFim = ocorrenciasAte({
  dataInicio: '2026-01-10',
  frequencia: 'mensal',
  intervalo: 1,
  ateData: '2026-12-31',
  dataFim: '2026-04-15',
});
ok(
  'data_fim corta a geracao',
  comFim.length === 4,
  comFim.map((o) => o.data),
);

const retomada = ocorrenciasAte({
  dataInicio: '2026-01-10',
  frequencia: 'mensal',
  intervalo: 1,
  ateData: '2026-12-31',
  primeiroNumero: 10,
});
ok('retoma do numero 10', retomada[0].numero === 10 && retomada[0].data === '2026-10-10');

const semFim = ocorrenciasAte({
  dataInicio: '2020-01-01',
  frequencia: 'semanal',
  intervalo: 1,
  ateData: '2200-01-01',
});
ok('trava de seguranca em 600', semFim.length === 600, semFim.length);

const proxima = proximaOcorrencia({
  dataInicio: '2026-01-10',
  frequencia: 'mensal',
  intervalo: 1,
  aPartirDe: '2026-09-08',
});
ok('proxima cobranca = 10/09', proxima?.data === '2026-09-10', proxima);

const encerrada = proximaOcorrencia({
  dataInicio: '2026-01-10',
  frequencia: 'mensal',
  intervalo: 1,
  aPartirDe: '2026-09-08',
  dataFim: '2026-05-10',
});
ok('plano encerrado nao tem proxima', encerrada === null, encerrada);

console.log('\n== custo mensal equivalente ==');
ok('mensal e ele mesmo', custoMensalEquivalente(39.9, 'mensal', 1) === 39.9);
ok('anual /12', custoMensalEquivalente(120, 'anual', 1) === 10);
ok('semanal ~ x4.33', Math.abs(custoMensalEquivalente(10, 'semanal', 1) - 43.33) < 0.01);

const verificarSql = async (): Promise<void> => {
  console.log('\n== SQL real das migrations ==');
  const sqlite = new DatabaseSync(':memory:');

  /** Shim minimo da API do expo-sqlite usada pelas migrations. */
  const db = {
    execAsync: (sql: string): Promise<void> => {
      sqlite.exec(sql);
      return Promise.resolve();
    },
    runAsync: (sql: string, params: unknown[] = []): Promise<void> => {
      sqlite.prepare(sql).run(...params);
      return Promise.resolve();
    },
    getFirstAsync: <T>(sql: string, params: unknown[] = []): Promise<T | null> =>
      Promise.resolve((sqlite.prepare(sql).get(...params) as T) ?? null),
    getAllAsync: <T>(sql: string, params: unknown[] = []): Promise<T[]> =>
      Promise.resolve(sqlite.prepare(sql).all(...params) as T[]),
  };

  // Lancamento antigo, gravado antes da migration 003 existir.
  await migrations[0].up(db as never);
  await migrations[1].up(db as never);
  await db.runAsync(
    `INSERT INTO transacoes (id, descricao, valor, data, created_at) VALUES ('velha', 'Mercado', -50, '2026-08-01', '2026-08-01')`,
  );

  await migrations[2].up(db as never);

  const velha = await db.getFirstAsync<{ contabilizado_saldo: number }>(
    `SELECT contabilizado_saldo FROM transacoes WHERE id = 'velha'`,
  );
  ok('backfill mantem o lancamento antigo no caixa', velha?.contabilizado_saldo === 1, velha);

  const recorrentesSumiu = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM sqlite_master WHERE name = 'recorrentes'`,
  );
  ok('tabela recorrentes orfa foi removida', recorrentesSumiu?.n === 0);

  await db.runAsync(
    `INSERT INTO planos_pagamento (id, tipo, descricao, valor_parcela, valor_total, total_parcelas,
                                   frequencia, intervalo, data_inicio, ativo, created_at)
     VALUES ('p1', 'parcelamento', 'Geladeira', -100, -1200, 12, 'mensal', 1, '2026-09-10', 1, 'now')`,
  );

  let checkFuncionou = false;
  try {
    await db.runAsync(
      `INSERT INTO planos_pagamento (id, tipo, descricao, valor_parcela, frequencia, intervalo, data_inicio, ativo, created_at)
       VALUES ('p2', 'emprestimo', 'X', -1, 'mensal', 1, '2026-01-01', 1, 'now')`,
    );
  } catch {
    checkFuncionou = true;
  }
  ok('CHECK barra tipo invalido', checkFuncionou);

  const inserirParcela = async (numero: number): Promise<void> => {
    await db.runAsync(
      `INSERT OR IGNORE INTO transacoes (id, descricao, valor, data, contabilizado_saldo, plano_id, parcela_numero, created_at)
       VALUES (?, ?, -100, ?, 1, 'p1', ?, 'now')`,
      [
        `t${numero}`,
        `Geladeira (${numero}/12)`,
        `2026-${String(9 + numero - 1).padStart(2, '0')}-10`,
        numero,
      ],
    );
  };

  await inserirParcela(1);
  await inserirParcela(2);
  // Segunda passada do gerador sobre o mesmo periodo.
  await db.runAsync(
    `INSERT OR IGNORE INTO transacoes (id, descricao, valor, data, contabilizado_saldo, plano_id, parcela_numero, created_at)
     VALUES ('duplicada', 'Geladeira (1/12)', -100, '2026-09-10', 1, 'p1', 1, 'now')`,
  );

  const totalParcelas = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM transacoes WHERE plano_id = 'p1'`,
  );
  ok('gerador e idempotente (indice unico parcial)', totalParcelas?.n === 2, totalParcelas);

  // Duas transacoes avulsas nao colidem no indice parcial.
  await db.runAsync(
    `INSERT INTO transacoes (id, descricao, valor, data, contabilizado_saldo, created_at)
     VALUES ('a1', 'Padaria', -10, '2026-09-08', 1, 'now'), ('a2', 'Feira', -20, '2026-09-08', 1, 'now')`,
  );
  const avulsas = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM transacoes WHERE plano_id IS NULL`,
  );
  ok('indice parcial nao afeta lancamentos avulsos', avulsas?.n === 3, avulsas);

  await db.runAsync(`PRAGMA foreign_keys = ON`);
  await db.runAsync(`DELETE FROM planos_pagamento WHERE id = 'p1'`);
  const orfas = await db.getFirstAsync<{ n: number }>(
    `SELECT COUNT(*) AS n FROM transacoes WHERE plano_id = 'p1'`,
  );
  ok('apagar o plano leva as cobrancas junto (CASCADE)', orfas?.n === 0, orfas);

  if (falhas > 0) {
    // Rejeitar a promise faz o processo sair com codigo diferente de zero.
    throw new Error(`${falhas} verificacao(oes) falharam`);
  }

  console.log('\nTUDO OK');
};

void verificarSql();
