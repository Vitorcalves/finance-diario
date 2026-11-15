import { v4 as uuidv4 } from 'uuid';
import { emTransacao, getConnection } from './database';
import { filtroDeAtivos, type OpcoesListagem, type SemExclusao } from './exclusaoLogica';
import { type HistoricoPreco, insertHistoricoPreco } from './historicoPreco';
import { desvincularVarianteDaLista } from './listaCompras';

export type ProdutoVariantes = {
  id: string;
  produto_id: string;
  marca_id: number | null;
  unidade_id: number | null;
  quantidade: number | null;
  codigo_barras: string | null;
  preco: number;
  created_at: string;
  /** Quando foi excluida (ISO); `null` = ativa. Ver `exclusaoLogica`. */
  deleted_at: string | null;
};

const COLUNAS =
  'id, produto_id, marca_id, unidade_id, quantidade, codigo_barras, preco, created_at, deleted_at';

/**
 * Variantes de todos os produtos. So as ativas; `comExcluidos` traz tambem as
 * excluidas, para dar nome ao historico.
 */
export const listProdutoVariantes = async (
  opcoes: OpcoesListagem = {},
): Promise<ProdutoVariantes[]> => {
  const db = await getConnection();

  return await db.getAllAsync<ProdutoVariantes>(
    `
        SELECT ${COLUNAS}
        FROM produto_variantes
        ${filtroDeAtivos(opcoes)}
        ORDER BY created_at DESC
    `,
  );
};

export const listProdutoVariantesByProduto = async (
  produtoId: string,
  opcoes: OpcoesListagem = {},
): Promise<ProdutoVariantes[]> => {
  const db = await getConnection();

  return await db.getAllAsync<ProdutoVariantes>(
    `
        SELECT ${COLUNAS}
        FROM produto_variantes
        WHERE produto_id = ?
        ${filtroDeAtivos(opcoes, 'AND')}
        ORDER BY created_at DESC
    `,
    [produtoId],
  );
};

export const insertProdutoVariantes = async (
  produto: SemExclusao<ProdutoVariantes>,
): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO produto_variantes (id, produto_id, marca_id, unidade_id, quantidade, codigo_barras, preco,
                                       created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      produto.id,
      produto.produto_id,
      produto.marca_id,
      produto.unidade_id,
      produto.quantidade,
      produto.codigo_barras,
      produto.preco,
      produto.created_at,
    ],
  );
};

/**
 * Exclui a variante sem apagar a linha: o historico de precos e os itens dos
 * lancamentos continuam ligados a ela. Na lista de compras, que e rascunho, os
 * itens e as cotacoes ficam sem a marca.
 */
export const deleteProdutoVariantesById = async (
  id: string,
  agora: string = new Date().toISOString(),
): Promise<void> =>
  emTransacao(async () => {
    const db = await getConnection();

    await db.runAsync(
      'UPDATE produto_variantes SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL',
      [agora, id],
    );
    await desvincularVarianteDaLista(id);
  });

export const updateProdutoVariantes = async (
  variante: SemExclusao<ProdutoVariantes>,
): Promise<void> => {
  const db = await getConnection();

  const varianteAntiga = await getProdutoVariantesById(variante.id);

  if (!varianteAntiga) {
    throw new Error('Variante não encontrada');
  }

  await db.runAsync(
    `
        UPDATE produto_variantes
        SET marca_id      = ?,
            unidade_id    = ?,
            quantidade    = ?,
            codigo_barras = ?,
            preco         = ?
        WHERE id = ?
    `,
    [
      variante.marca_id,
      variante.unidade_id,
      variante.quantidade,
      variante.codigo_barras,
      variante.preco,
      variante.id,
    ],
  );
};

/**
 * Registra o preco praticado em um lancamento: atualiza o preco atual da variante
 * e guarda a ocorrencia no historico, sempre amarrada ao produto, a variante e
 * (quando informada) a empresa onde a compra aconteceu.
 */
export const registrarPrecoVariante = async (params: {
  produtoId: string;
  varianteId: string;
  empresaId: string | null;
  preco: number;
  data: string;
  /** Local onde o preco foi pago ou cotado; ver `Locais`. */
  local: number;
}): Promise<void> => {
  const db = await getConnection();

  const variante = await getProdutoVariantesById(params.varianteId);

  if (!variante) {
    throw new Error('Variante não encontrada');
  }

  await db.runAsync('UPDATE produto_variantes SET preco = ? WHERE id = ?', [
    params.preco,
    params.varianteId,
  ]);

  const historico: HistoricoPreco = {
    id: uuidv4(),
    produto_id: params.produtoId,
    variante_id: params.varianteId,
    empresa_id: params.empresaId,
    preco: params.preco,
    data: params.data,
    local: params.local,
    created_at: new Date().toISOString(),
  };

  await insertHistoricoPreco(historico);
};

/** Busca pelo id mesmo que a variante tenha sido excluida (confira `deleted_at`). */
export const getProdutoVariantesById = async (id: string): Promise<ProdutoVariantes | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<ProdutoVariantes>(
    `
        SELECT ${COLUNAS}
        FROM produto_variantes
        WHERE id = ?
    `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};
