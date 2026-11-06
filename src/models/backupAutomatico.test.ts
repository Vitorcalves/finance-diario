import { beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { AGORA, desfazerUltimaMigration, prepararBanco } from '../../tests/setup/banco';
import {
  __falharEm,
  __novoSistemaDeArquivos,
  makeDirectoryAsync,
  readAsStringAsync,
  readDirectoryAsync,
  writeAsStringAsync,
} from '../../tests/setup/expo-file-system';
import { analisarBackup, BackupInvalidoError, exportarBanco, importarBanco } from './backup';
import {
  backupAntesDasMigrations,
  BackupAutomaticoError,
  criarBackupManual,
  gravarBackupAutomatico,
  lerBackupAutomatico,
  listarBackupsAutomaticos,
  MAX_BACKUPS_AUTOMATICOS,
  pastaDosBackups,
  recriarBancoComBackup,
} from './backupAutomatico';
import { getConnection, initializeDatabase } from './database';
import { insertMarca, listMarcas } from './marcas';
import { migrations } from './migrations';

const ULTIMA = migrations[migrations.length - 1].id;
const PENULTIMA = migrations[migrations.length - 2].id;

const nomeDe = (caminho: string): string => caminho.slice(pastaDosBackups().length);

/** Nomes na pasta de backups em ordem alfabetica, que para os backups e a cronologica. */
const nomesNaPasta = async (): Promise<string[]> =>
  (await readDirectoryAsync(pastaDosBackups())).sort();

/** Copias de datas antigas, como as deixadas por atualizacoes anteriores do app. */
const criarBackupsAntigos = async (quantidade: number): Promise<string[]> => {
  await makeDirectoryAsync(pastaDosBackups(), { intermediates: true });
  const nomes: string[] = [];

  for (let dia = 1; dia <= quantidade; dia += 1) {
    const nome = `2020-01-${String(dia).padStart(2, '0')}T00-00-00-000Z_migration-1-para-2.json`;
    await writeAsStringAsync(`${pastaDosBackups()}${nome}`, '{}');
    nomes.push(nome);
  }

  return nomes;
};

const versaoDoBanco = async (): Promise<number | undefined> => {
  const db = await getConnection();
  const linha = await db.getFirstAsync<{ id: number }>(
    'SELECT id FROM migrations ORDER BY id DESC LIMIT 1',
  );

  return linha?.id;
};

beforeEach(async () => {
  __novoSistemaDeArquivos();
  await prepararBanco();
});

describe('gravarBackupAutomatico', () => {
  test('grava o JSON do banco num arquivo novo da pasta de backups', async () => {
    await insertMarca({ nome: 'Marca A', created_at: AGORA });

    const caminho = await gravarBackupAutomatico('teste');

    assert.match(nomeDe(caminho), /^\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z_teste\.json$/);

    const backup = analisarBackup(await readAsStringAsync(caminho));
    assert.equal(backup.tabelas.marcas.length, 1);
    assert.deepEqual(backup.tabelas, (await exportarBanco()).tabelas);
  });

  test(`guarda so as ${MAX_BACKUPS_AUTOMATICOS} copias mais recentes`, async () => {
    const antigos = await criarBackupsAntigos(MAX_BACKUPS_AUTOMATICOS + 1);

    const caminho = await gravarBackupAutomatico('novo');

    // Com a nova, passariam do limite em duas: saem as duas mais antigas.
    assert.deepEqual(await nomesNaPasta(), [...antigos.slice(2), nomeDe(caminho)]);
  });

  test('nao conta nem apaga arquivos que nao sao backup', async () => {
    const antigos = await criarBackupsAntigos(MAX_BACKUPS_AUTOMATICOS);
    await writeAsStringAsync(`${pastaDosBackups()}anotacoes.txt`, 'x');
    await writeAsStringAsync(`${pastaDosBackups()}copia-manual.json`, '{}');

    const caminho = await gravarBackupAutomatico('novo');

    assert.deepEqual(
      await nomesNaPasta(),
      [...antigos.slice(1), nomeDe(caminho), 'anotacoes.txt', 'copia-manual.json'].sort(),
    );
  });

  test('se a gravacao falhar, o erro sobe e nenhuma copia antiga sai', async () => {
    const antigos = await criarBackupsAntigos(MAX_BACKUPS_AUTOMATICOS);
    __falharEm('writeAsStringAsync', new Error('disco cheio'));

    await assert.rejects(gravarBackupAutomatico('novo'), /disco cheio/);

    assert.deepEqual(await nomesNaPasta(), antigos);
  });

  test('se apagar as antigas falhar, a copia nova fica e sai so um aviso', async (t) => {
    const antigos = await criarBackupsAntigos(MAX_BACKUPS_AUTOMATICOS);
    __falharEm('deleteAsync', new Error('sem permissao'));
    const aviso = t.mock.method(console, 'warn', () => undefined);

    const caminho = await gravarBackupAutomatico('novo');

    assert.deepEqual(await nomesNaPasta(), [...antigos, nomeDe(caminho)]);
    assert.equal(aviso.mock.callCount(), 1);
  });
});

describe('backupAntesDasMigrations', () => {
  test('o initializeDatabase copia o banco antes de aplicar a migration pendente', async () => {
    await insertMarca({ nome: 'Marca A', created_at: AGORA });
    await desfazerUltimaMigration();

    await initializeDatabase({ antesDeMigrar: backupAntesDasMigrations });

    const nomes = await nomesNaPasta();
    assert.equal(nomes.length, 1);
    assert.match(nomes[0], new RegExp(`_migration-${PENULTIMA}-para-${ULTIMA}\\.json$`));

    // A copia e do banco de antes: versao antiga e os dados que ja existiam.
    const backup = analisarBackup(await readAsStringAsync(`${pastaDosBackups()}${nomes[0]}`));
    assert.equal(backup.schema_version, PENULTIMA);
    assert.equal(backup.tabelas.marcas.length, 1);

    assert.equal(await versaoDoBanco(), ULTIMA);
  });

  test('sem conseguir copiar, o banco fica na versao antiga', async () => {
    await desfazerUltimaMigration();
    __falharEm('writeAsStringAsync', new Error('disco cheio'));

    await assert.rejects(
      initializeDatabase({ antesDeMigrar: backupAntesDasMigrations }),
      /Backup antes das migrations falhou; o banco não foi atualizado \(disco cheio\)/,
    );

    assert.equal(await versaoDoBanco(), PENULTIMA);
  });
});

describe('listarBackupsAutomaticos', () => {
  test('antes da primeira copia a lista vem vazia', async () => {
    assert.deepEqual(await listarBackupsAutomaticos(), []);
  });

  test('lista da copia mais nova para a mais antiga, com data e motivo', async () => {
    await criarBackupsAntigos(2);
    await writeAsStringAsync(`${pastaDosBackups()}anotacoes.txt`, 'x');
    for (const nome of [
      '2020-01-03T10-20-30-400Z_recriar-banco.json',
      '2020-01-04T00-00-00-000Z_outro-motivo.json',
    ]) {
      await writeAsStringAsync(`${pastaDosBackups()}${nome}`, '{}');
    }

    const copias = await listarBackupsAutomaticos();

    assert.deepEqual(
      copias.map(({ criadoEm, descricao }) => ({ criadoEm, descricao })),
      [
        // Motivo que o app nao conhece aparece como veio no nome.
        { criadoEm: '2020-01-04T00:00:00.000Z', descricao: 'Outro motivo' },
        { criadoEm: '2020-01-03T10:20:30.400Z', descricao: 'Antes de recriar o banco' },
        {
          criadoEm: '2020-01-02T00:00:00.000Z',
          descricao: 'Antes de atualizar o banco (versão 1 → 2)',
        },
        {
          criadoEm: '2020-01-01T00:00:00.000Z',
          descricao: 'Antes de atualizar o banco (versão 1 → 2)',
        },
      ],
    );
    assert.equal(copias[0].caminho, `${pastaDosBackups()}${copias[0].nome}`);
  });
});

describe('lerBackupAutomatico', () => {
  test('a copia gravada restaura o banco', async () => {
    await insertMarca({ nome: 'Marca A', created_at: AGORA });
    await gravarBackupAutomatico('teste');
    await insertMarca({ nome: 'Marca B', created_at: AGORA });

    const [copia] = await listarBackupsAutomaticos();
    await importarBanco(await lerBackupAutomatico(copia));

    assert.deepEqual(
      (await listMarcas()).map((marca) => marca.nome),
      ['Marca A'],
    );
  });

  test('arquivo que nao e backup do app e recusado', async () => {
    await makeDirectoryAsync(pastaDosBackups(), { intermediates: true });
    await writeAsStringAsync(`${pastaDosBackups()}2020-01-01T00-00-00-000Z_teste.json`, '{"x":1}');
    const [copia] = await listarBackupsAutomaticos();

    await assert.rejects(lerBackupAutomatico(copia), BackupInvalidoError);
  });
});

describe('recriarBancoComBackup', () => {
  test('guarda o banco de antes e entao recria vazio', async () => {
    await insertMarca({ nome: 'Marca A', created_at: AGORA });

    await recriarBancoComBackup();

    assert.deepEqual(await listMarcas(), []);
    assert.equal(await versaoDoBanco(), ULTIMA);

    const copias = await listarBackupsAutomaticos();
    assert.deepEqual(
      copias.map((copia) => copia.descricao),
      ['Antes de recriar o banco'],
    );

    const backup = await lerBackupAutomatico(copias[0]);
    assert.deepEqual(
      backup.tabelas.marcas.map((marca) => marca.nome),
      ['Marca A'],
    );
  });

  test('sem conseguir copiar, nada e apagado', async () => {
    await insertMarca({ nome: 'Marca A', created_at: AGORA });
    __falharEm('writeAsStringAsync', new Error('disco cheio'));

    await assert.rejects(recriarBancoComBackup(), (error: unknown) => {
      assert.ok(error instanceof BackupAutomaticoError, 'esperava BackupAutomaticoError');
      assert.match(error.message, /nada foi apagado \(disco cheio\)/);
      return true;
    });

    assert.deepEqual(
      (await listMarcas()).map((marca) => marca.nome),
      ['Marca A'],
    );
  });
});

describe('criarBackupManual', () => {
  test('grava uma copia do banco que entra no rodizio das outras', async () => {
    const antigos = await criarBackupsAntigos(MAX_BACKUPS_AUTOMATICOS);
    await insertMarca({ nome: 'Marca A', created_at: AGORA });

    await criarBackupManual();

    const [nova, ...resto] = await listarBackupsAutomaticos();
    assert.equal(nova.descricao, 'Backup manual');
    assert.equal((await lerBackupAutomatico(nova)).tabelas.marcas.length, 1);
    // A mais antiga saiu para a manual entrar.
    assert.deepEqual(resto.map((copia) => copia.nome).reverse(), antigos.slice(1));
  });
});
