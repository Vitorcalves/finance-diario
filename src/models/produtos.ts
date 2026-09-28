import { getConnection } from './database';

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
};

/** Campos com valor padrao no insert: produto novo nasce frequente. */
export type NovoProduto = Omit<Produto, 'eventual'> & Partial<Pick<Produto, 'eventual'>>;

const COLUNAS = 'id, nome, preco, unidade_id, eventual, created_at';

/** Ordena pelo nome como se le em portugues: `Água` junto do `A`, sem separar maiusculas. */
const porNome = (a: Produto, b: Produto): number =>
  a.nome.localeCompare(b.nome, 'pt-BR', { sensitivity: 'base' });

/** Todos os produtos, em ordem alfabetica. */
export const listProdutos = async (): Promise<Produto[]> => {
  const db = await getConnection();

  const produtos = await db.getAllAsync<Produto>(
    `
        SELECT ${COLUNAS}
        FROM produtos
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

export const deleteProdutoById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM produtos WHERE id = ?', [id]);
};

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

export const updateProduto = async (produto: Produto): Promise<void> => {
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
