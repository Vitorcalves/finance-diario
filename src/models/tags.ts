import { v4 as uuidv4 } from 'uuid';
import { normalizarTexto } from '../utils/busca';
import { emTransacao, getConnection } from './database';
import { NATUREZAS_DO_FLUXO, naturezasSql } from './naturezaTransacao';

/**
 * Tag de evento ("Viagem julho", "Reforma"): junta lancamentos de categorias
 * diferentes para responder "quanto custou a viagem?", o que a categoria nao
 * responde. Um lancamento pode ter varias tags (tabela `transacoes_tags`).
 */
export type Tag = {
  id: string;
  nome: string;
  /** Anotacao livre sobre o evento; `''` quando nao ha. */
  descricao: string;
  created_at: string;
};

/** A tag com o que foi gasto e recebido nela. */
export type ResumoTag = Tag & {
  /** Gastos e receitas com a tag; parcela conta uma a uma, como na busca. */
  quantidade: number;
  /** Soma das saidas, positiva. Parcelas a vencer entram: o gasto ja foi feito. */
  gastos: number;
  /** Soma das entradas (reembolso, venda), positiva. */
  entradas: number;
  /** Parte dos `gastos` em parcelas que ainda vao vencer, positiva. */
  aVencer: number;
  /**
   * Primeiro e ultimo dia do evento (YYYY-MM-DD); `null` sem lancamentos.
   * Compra parcelada conta pela data da compra, e nao pela ultima parcela.
   */
  inicio: string | null;
  fim: string | null;
};

export const TAMANHO_MAXIMO_NOME_TAG = 40;

export class ValidacaoTagError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidacaoTagError';
  }
}

export type DadosTag = {
  /** Ausente cria uma tag nova. */
  id?: string;
  nome: string;
  descricao?: string;
};

const COLUNAS = 'id, nome, descricao, created_at';

/** Junta espacos repetidos e tira os das pontas. */
const limpar = (texto: string): string => texto.replace(/\s+/g, ' ').trim();

export const listTags = async (): Promise<Tag[]> => {
  const db = await getConnection();

  return db.getAllAsync<Tag>(
    `
        SELECT ${COLUNAS}
        FROM tags
        ORDER BY nome COLLATE NOCASE
    `,
  );
};

/**
 * Cada tag com os totais dos lancamentos dela, do evento mais recente ao mais
 * antigo; tag ainda sem lancamento entra pela data em que foi criada.
 *
 * So gasto e receita entram nas somas (`NATUREZAS_DO_FLUXO`): o registro da
 * compra parcelada repetiria o valor das parcelas, e transferencia so muda o
 * dinheiro de lugar. As datas do evento usam o registro da compra e a 1a
 * cobranca de cada plano, para um parcelamento em 10x nao esticar a viagem de
 * julho ate abril.
 */
export const listResumoTags = async (hoje: string): Promise<ResumoTag[]> => {
  const db = await getConnection();
  const fluxo = naturezasSql(NATUREZAS_DO_FLUXO);
  const dataDoEvento = `CASE
      WHEN t.parcela_numero IS NULL OR t.parcela_numero <= 1 THEN substr(t.data, 1, 10)
      END`;

  return db.getAllAsync<ResumoTag>(
    `
        SELECT g.id,
               g.nome,
               g.descricao,
               g.created_at,
               COUNT(CASE WHEN t.natureza IN (${fluxo}) THEN 1 END) AS quantidade,
               COALESCE(SUM(CASE WHEN t.natureza IN (${fluxo}) AND t.valor < 0
                                     THEN -t.valor END), 0) AS gastos,
               COALESCE(SUM(CASE WHEN t.natureza IN (${fluxo}) AND t.valor > 0
                                     THEN t.valor END), 0) AS entradas,
               COALESCE(SUM(CASE WHEN t.natureza IN (${fluxo}) AND t.valor < 0
                                      AND substr(t.data, 1, 10) > ?
                                     THEN -t.valor END), 0) AS aVencer,
               MIN(${dataDoEvento}) AS inicio,
               MAX(${dataDoEvento}) AS fim
        FROM tags g
                 LEFT JOIN transacoes_tags tt ON tt.tag_id = g.id
                 LEFT JOIN transacoes t ON t.id = tt.transacao_id
            AND t.natureza IN (${fluxo}, 'registro_compra')
        GROUP BY g.id
        ORDER BY COALESCE(MAX(${dataDoEvento}), substr(g.created_at, 1, 10)) DESC,
                 g.nome COLLATE NOCASE
    `,
    [hoje],
  );
};

/**
 * Cria ou atualiza a tag. O nome e obrigatorio e unico, sem diferenciar
 * maiusculas nem acentos: "Viagem Julho" e "viagem julho" seriam o mesmo
 * evento dividido em dois totais.
 */
export const salvarTag = async (
  dados: DadosTag,
  agora: string = new Date().toISOString(),
): Promise<Tag> => {
  const nome = limpar(dados.nome);
  const descricao = limpar(dados.descricao ?? '');

  if (!nome) {
    throw new ValidacaoTagError('Informe o nome da tag.');
  }

  if (nome.length > TAMANHO_MAXIMO_NOME_TAG) {
    throw new ValidacaoTagError(
      `O nome da tag pode ter até ${TAMANHO_MAXIMO_NOME_TAG} caracteres.`,
    );
  }

  const repetida = (await listTags()).find(
    (tag) => tag.id !== dados.id && normalizarTexto(tag.nome) === normalizarTexto(nome),
  );

  if (repetida) {
    throw new ValidacaoTagError(`Já existe a tag "${repetida.nome}".`);
  }

  const db = await getConnection();

  if (dados.id) {
    const atual = await db.getFirstAsync<Tag>(`SELECT ${COLUNAS} FROM tags WHERE id = ?`, [
      dados.id,
    ]);

    if (!atual) {
      throw new ValidacaoTagError('Essa tag não existe mais.');
    }

    await db.runAsync('UPDATE tags SET nome = ?, descricao = ? WHERE id = ?', [
      nome,
      descricao,
      dados.id,
    ]);

    return { ...atual, nome, descricao };
  }

  const tag: Tag = { id: uuidv4(), nome, descricao, created_at: agora };

  await db.runAsync('INSERT INTO tags (id, nome, descricao, created_at) VALUES (?, ?, ?, ?)', [
    tag.id,
    tag.nome,
    tag.descricao,
    tag.created_at,
  ]);

  return tag;
};

/** Os lancamentos continuam; so perdem a tag. */
export const deleteTag = async (id: string): Promise<void> =>
  emTransacao(async () => {
    const db = await getConnection();
    await db.runAsync('DELETE FROM transacoes_tags WHERE tag_id = ?', [id]);
    await db.runAsync('DELETE FROM tags WHERE id = ?', [id]);
  });

/** Ids das tags de cada lancamento, cada lista em ordem alfabetica de nome. */
export const listTagsPorTransacao = async (): Promise<Map<string, string[]>> => {
  const db = await getConnection();
  const linhas = await db.getAllAsync<{ transacao_id: string; tag_id: string }>(
    `
        SELECT tt.transacao_id, tt.tag_id
        FROM transacoes_tags tt
                 JOIN tags g ON g.id = tt.tag_id
        ORDER BY g.nome COLLATE NOCASE
    `,
  );

  const porTransacao = new Map<string, string[]>();

  for (const linha of linhas) {
    const lista = porTransacao.get(linha.transacao_id);

    if (lista) {
      lista.push(linha.tag_id);
    } else {
      porTransacao.set(linha.transacao_id, [linha.tag_id]);
    }
  }

  return porTransacao;
};

/** Ids das tags de um lancamento. */
export const tagsDaTransacao = async (transacaoId: string): Promise<string[]> => {
  const db = await getConnection();
  const linhas = await db.getAllAsync<{ tag_id: string }>(
    'SELECT tag_id FROM transacoes_tags WHERE transacao_id = ?',
    [transacaoId],
  );

  return linhas.map((linha) => linha.tag_id);
};

/**
 * Grava as ligacoes de um lancamento com as tags. Tag que nao existe mais
 * (apagada no meio do caminho) e pulada, e repetida entra uma vez so.
 */
const ligarTags = async (transacaoId: string, tagIds: string[], agora: string): Promise<void> => {
  const db = await getConnection();

  for (const tagId of new Set(tagIds)) {
    await db.runAsync(
      `
          INSERT OR IGNORE INTO transacoes_tags (id, transacao_id, tag_id, created_at)
          SELECT ?, ?, id, ?
          FROM tags
          WHERE id = ?
      `,
      [uuidv4(), transacaoId, agora, tagId],
    );
  }
};

/**
 * Troca as tags de um lancamento pelas informadas (lista vazia tira todas).
 *
 * Parcela e assinatura sao o mesmo gasto repetido: as tags vao para todas as
 * linhas do plano, como a categoria. Devolve quantas linhas mudaram.
 */
export const definirTagsTransacao = async (
  transacaoId: string,
  tagIds: string[],
  agora: string = new Date().toISOString(),
): Promise<number> =>
  emTransacao(async () => {
    const db = await getConnection();
    const transacao = await db.getFirstAsync<{ plano_id: string | null }>(
      'SELECT plano_id FROM transacoes WHERE id = ?',
      [transacaoId],
    );

    if (!transacao) {
      return 0;
    }

    const alvos = transacao.plano_id
      ? (
          await db.getAllAsync<{ id: string }>('SELECT id FROM transacoes WHERE plano_id = ?', [
            transacao.plano_id,
          ])
        ).map((linha) => linha.id)
      : [transacaoId];

    for (const alvo of alvos) {
      await db.runAsync('DELETE FROM transacoes_tags WHERE transacao_id = ?', [alvo]);
      await ligarTags(alvo, tagIds, agora);
    }

    return alvos.length;
  });

/** Devolve as tags de um lancamento apagado (o "Desfazer" da exclusao). */
export const restaurarTagsTransacao = async (
  transacaoId: string,
  tagIds: string[],
  agora: string = new Date().toISOString(),
): Promise<void> => ligarTags(transacaoId, tagIds, agora);

/**
 * Cobranca nova de um plano (a assinatura do mes que chegou) recebe as tags
 * das cobrancas que ja existem, assim como herda a categoria do plano.
 */
export const herdarTagsDoPlano = async (
  transacaoId: string,
  planoId: string,
  agora: string = new Date().toISOString(),
): Promise<void> => {
  const db = await getConnection();
  const linhas = await db.getAllAsync<{ tag_id: string }>(
    `
        SELECT DISTINCT tt.tag_id
        FROM transacoes_tags tt
                 JOIN transacoes t ON t.id = tt.transacao_id
        WHERE t.plano_id = ?
          AND t.id <> ?
    `,
    [planoId, transacaoId],
  );

  await ligarTags(
    transacaoId,
    linhas.map((linha) => linha.tag_id),
    agora,
  );
};
