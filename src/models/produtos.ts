import { emTransacao, getConnection } from './database';
import { filtroDeAtivos, type OpcoesListagem, type SemExclusao } from './exclusaoLogica';
import { removerProdutoDaLista } from './listaCompras';

export type Produto = {
  id: string;
  nome: string;
  preco: number;
  unidade_id: number | null;
  /**
   * `1` quando e compra eventual (mouse, liquidificador...): fora da lista
   * padrao e so aparece no seletor do lancamento quando buscado.
   */
  eventual: number;
  created_at: string;
  /** Quando foi excluido (ISO); `null` = ativo. Ver `exclusaoLogica`. */
  deleted_at: string | null;
};

/** Campos com valor padrao no insert: produto novo nasce frequente e ativo. */
export type NovoProduto = Omit<Produto, 'eventual' | 'deleted_at'> &
  Partial<Pick<Produto, 'eventual'>>;

const COLUNAS = 'id, nome, preco, unidade_id, eventual, created_at, deleted_at';

/** Ordena pelo nome como se le em portugues: `Água` junto do `A`, sem separar maiusculas. */
const porNome = (a: Produto, b: Produto): number =>
  a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });

/**
 * Produtos em ordem alfabetica. So os ativos; `comExcluidos` traz tambem os
 * excluidos, para dar nome ao historico.
 */
export const listProdutos = async (opcoes: OpcoesListagem = {}): Promise<Produto[]> => {
  const db = await getConnection();

  const produtos = await db.getAllAsync<Produto>(
    `
        SELECT ${COLUNAS}
        FROM produtos
        ${filtroDeAtivos(opcoes)}
    `,
  );

  // O ORDER BY do SQLite compara bytes e jogaria `Água` depois do `Z`.
  return produtos.sort(porNome);
};

export const insertProduto = async (produto: NovoProduto): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO produtos (id, nome, preco, unidade_id, eventual, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
    `,
    [
      produto.id,
      produto.nome,
      produto.preco,
      produto.unidade_id,
      produto.eventual ?? 0,
      produto.created_at,
    ],
  );
};

/**
 * Exclui o produto e as variantes dele sem apagar as linhas: o historico de
 * precos e os itens dos lancamentos continuam ligados a eles, com nome. Os
 * itens do produto saem da lista de compras, que e rascunho e nao historico.
 */
export const deleteProdutoById = async (
  id: string,
  agora: string = new Date().toISOString(),
): Promise<void> =>
  emTransacao(async () => {
    const db = await getConnection();

    await db.runAsync('UPDATE produtos SET deleted_at = ? WHERE id = ? AND deleted_at IS NULL', [
      agora,
      id,
    ]);
    await db.runAsync(
      'UPDATE produto_variantes SET deleted_at = ? WHERE produto_id = ? AND deleted_at IS NULL',
      [agora, id],
    );
    await removerProdutoDaLista(id);
  });

/** Busca pelo id mesmo que o produto tenha sido excluido (confira `deleted_at`). */
export const getProdutoById = async (id: string): Promise<Produto | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<Produto>(
    `
        SELECT ${COLUNAS}
        FROM produtos
        WHERE id = ?
    `,
    [id],
  );

  if (!row) {
    return null;
  }

  return row;
};

export const updateProduto = async (produto: SemExclusao<Produto>): Promise<void> => {
  const db = await getConnection();

  const produto_oud = await getProdutoById(produto.id);

  if (!produto_oud) {
    throw new Error('Produto não encontrado');
  }

  await db.runAsync(
    `
        UPDATE produtos
        SET nome       = ?,
            preco      = ?,
            unidade_id = ?,
            eventual   = ?
        WHERE id = ?
    `,
    [produto.nome, produto.preco, produto.unidade_id ?? null, produto.eventual, produto.id],
  );
};
