import {getConnection} from './database';
import {HistoricoPreco, insertHistoricoPreco} from './historicoPreco';
import {v4 as uuidv4} from 'uuid';

export type Produto = {
  id: string;
  nome: string;
  preco: number;
  unidade_id: number | null;
  created_at: string;
};

export const listProdutos = async (): Promise<Produto[]> => {
  const db = await getConnection();

  return await db.getAllAsync<Produto>(
    `
        SELECT id,
               nome,
               preco,
               unidade_id,
               created_at
        FROM produtos
        ORDER BY created_at DESC
    `,
  );
};

export const insertProduto = async (produto: Produto): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO produtos (id, nome, preco, unidade_id, created_at)
        VALUES (?, ?, ?, ?, ?)
    `,
    [
      produto.id,
      produto.nome,
      produto.preco,
      produto.unidade_id,
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
        SELECT id,
               nome,
               preco,
               unidade_id,
               created_at
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
            unidade_id = ?
        WHERE id = ?
    `,
    [
      produto.nome,
      produto.preco,
      produto.unidade_id ?? null,
      produto.id,
    ],
  );

};

export const upadetePrecoProduto = async (produto_id: string, preco: number): Promise<void> => {
  const db = await getConnection();

  const produto_oud = await getProdutoById(produto_id);

  if (!produto_oud) {
    throw new Error('Produto não encontrado');
  }

  await db.runAsync(
    `
        UPDATE produtos
        SET preco = ?
        WHERE id = ?
    `,
    [preco, produto_id],
  );

  // Inserir um novo registro no histórico de preços
  const historico: HistoricoPreco = {
    id: uuidv4(),
    produto_id,
    preco,
    // aaaaaaaaaaaaaaaa
    variante_id: uuidv4(),
    empresa_id: uuidv4(),
    data: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  await insertHistoricoPreco(historico);
};
