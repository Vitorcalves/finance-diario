import * as FileSystem from 'expo-file-system/legacy';
import { analisarBackup, type BackupJson, exportarBanco } from './backup';
import { type AtualizacaoDoBanco, recriarDatabase } from './database';

/**
 * Copias automaticas do banco, no mesmo JSON do export da tela Integracao,
 * feitas antes das migrations pendentes e antes do "Recriar banco" do Menu. O
 * botao "Criar backup no app" (Integracao, modo Exportar) faz uma na hora, que
 * divide a pasta e o rodizio com as outras. O modo Importar lista as copias e
 * restaura qualquer uma.
 *
 * Ficam em `backups/`, na pasta de documentos do app: o sistema nao a limpa
 * sozinho, como faz com o cache. So as ultimas `MAX_BACKUPS_AUTOMATICOS` sao
 * mantidas; a cada copia nova, as mais antigas saem.
 *
 * O nome do arquivo comeca pela data e hora da exportacao (UTC, largura fixa),
 * entao a ordem alfabetica dos nomes e a ordem cronologica.
 */

export const MAX_BACKUPS_AUTOMATICOS = 5;

/** Ex.: `2026-11-06T18-52-36-184Z_migration-15-para-16.json`: data, hora e motivo. */
const NOME_DE_BACKUP = /^(\d{4}-\d{2}-\d{2})T(\d{2})-(\d{2})-(\d{2})-(\d{3})Z_(.+)\.json$/;

/** Motivo gravado pelo `backupAntesDasMigrations`. */
const MOTIVO_DE_MIGRATION = /^migration-(\d+)-para-(\d+)$/;

/** Motivo gravado pelo `recriarBancoComBackup`. */
const MOTIVO_RECRIAR = 'recriar-banco';

/** Motivo gravado pelo `criarBackupManual`. */
const MOTIVO_MANUAL = 'manual';

/** A copia nao pode ser gravada; a mensagem, pronta para a tela, diz que nada foi alterado. */
export class BackupAutomaticoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BackupAutomaticoError';
  }
}

export type BackupAutomatico = {
  nome: string;
  /** Caminho completo do arquivo. */
  caminho: string;
  /** Quando a copia foi feita, em ISO (UTC). */
  criadoEm: string;
  /** Por que a copia foi feita, pronto para a tela. */
  descricao: string;
};

/** Pasta dos backups automaticos, terminada em `/`. */
export const pastaDosBackups = (): string => {
  if (!FileSystem.documentDirectory) {
    throw new Error('Pasta de documentos do app indisponível.');
  }

  return `${FileSystem.documentDirectory}backups/`;
};

const detalheDe = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

/** `:` e `.` saem do horario: `:` nao e aceito em todo sistema de arquivos. */
const carimbo = (iso: string): string => iso.replace(/[:.]/g, '-');

/** `migration-15-para-16` vira "Antes de atualizar o banco (versão 15 → 16)". */
const descreverMotivo = (motivo: string): string => {
  const migration = MOTIVO_DE_MIGRATION.exec(motivo);

  if (migration) {
    return `Antes de atualizar o banco (versão ${migration[1]} → ${migration[2]})`;
  }

  if (motivo === MOTIVO_RECRIAR) {
    return 'Antes de recriar o banco';
  }

  if (motivo === MOTIVO_MANUAL) {
    return 'Backup manual';
  }

  const texto = motivo.replace(/-/g, ' ');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/** Backups da pasta, do mais novo para o mais antigo. Outros arquivos ficam de fora. */
const lerPasta = async (pasta: string): Promise<BackupAutomatico[]> => {
  const nomes = (await FileSystem.readDirectoryAsync(pasta)).sort().reverse();
  const backups: BackupAutomatico[] = [];

  for (const nome of nomes) {
    const partes = NOME_DE_BACKUP.exec(nome);

    if (partes) {
      const [, data, hora, minuto, segundo, milissegundo, motivo] = partes;

      backups.push({
        nome,
        caminho: `${pasta}${nome}`,
        criadoEm: `${data}T${hora}:${minuto}:${segundo}.${milissegundo}Z`,
        descricao: descreverMotivo(motivo),
      });
    }
  }

  return backups;
};

/** Apaga as copias alem das `MAX_BACKUPS_AUTOMATICOS` mais recentes. */
const apagarExcedentes = async (pasta: string): Promise<void> => {
  const excedentes = (await lerPasta(pasta)).slice(MAX_BACKUPS_AUTOMATICOS);

  for (const backup of excedentes) {
    await FileSystem.deleteAsync(backup.caminho, { idempotent: true });
  }
};

/** Copias guardadas, da mais nova para a mais antiga. */
export const listarBackupsAutomaticos = async (): Promise<BackupAutomatico[]> => {
  const pasta = pastaDosBackups();

  // Ate a primeira copia a pasta nem existe.
  const info = await FileSystem.getInfoAsync(pasta);
  return info.exists ? lerPasta(pasta) : [];
};

/** Le e valida o JSON de uma copia, pronto para o `importarBanco`. */
export const lerBackupAutomatico = async (backup: BackupAutomatico): Promise<BackupJson> => {
  return analisarBackup(await FileSystem.readAsStringAsync(backup.caminho));
};

/**
 * Exporta o banco para um arquivo novo na pasta de backups e apaga as copias
 * que passarem do limite. Devolve o caminho do arquivo gravado.
 *
 * Erro ao gravar sobe para quem chamou, e nesse caso nenhuma copia antiga e
 * apagada. Erro ao apagar as antigas nao sobe: a copia nova ja esta salva, e o
 * pior que acontece e sobrar arquivo.
 */
export const gravarBackupAutomatico = async (motivo: string): Promise<string> => {
  const pasta = pastaDosBackups();
  const backup = await exportarBanco();
  const caminho = `${pasta}${carimbo(backup.exportado_em)}_${motivo}.json`;

  await FileSystem.makeDirectoryAsync(pasta, { intermediates: true });
  await FileSystem.writeAsStringAsync(caminho, JSON.stringify(backup));

  try {
    await apagarExcedentes(pasta);
  } catch (error: unknown) {
    console.warn('Não foi possível apagar os backups automáticos antigos', error);
  }

  return caminho;
};

/** Botao "Criar backup no app" da Integracao: uma copia na hora, no rodizio das outras. */
export const criarBackupManual = async (): Promise<void> => {
  await gravarBackupAutomatico(MOTIVO_MANUAL);
};

/**
 * `antesDeMigrar` do `initializeDatabase`: copia o banco antes de aplicar as
 * migrations pendentes.
 *
 * Sem a copia, o erro sobe e nenhuma migration roda. O app nao abre, mas o
 * banco fica intacto na versao antiga; migrar sem ter para onde voltar seria
 * pior.
 */
export const backupAntesDasMigrations = async ({
  versaoAtual,
  versaoNova,
}: AtualizacaoDoBanco): Promise<void> => {
  try {
    await gravarBackupAutomatico(`migration-${versaoAtual}-para-${versaoNova}`);
  } catch (error: unknown) {
    throw new BackupAutomaticoError(
      `Backup antes das migrations falhou; o banco não foi atualizado (${detalheDe(error)}).`,
    );
  }
};

/**
 * "Recriar banco" do Menu: guarda uma copia do banco e so entao apaga tudo e
 * recria. Sem a copia, nada e apagado e o erro sobe como
 * `BackupAutomaticoError`; erro do proprio recriar sobe como veio.
 */
export const recriarBancoComBackup = async (): Promise<void> => {
  try {
    await gravarBackupAutomatico(MOTIVO_RECRIAR);
  } catch (error: unknown) {
    throw new BackupAutomaticoError(
      `Não foi possível fazer o backup, então nada foi apagado (${detalheDe(error)}).`,
    );
  }

  await recriarDatabase();
};
