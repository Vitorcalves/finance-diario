import { getConnection } from './database';
import { HistoricoPrecoProduto, insertHistoricoPrecoProduto } from './historicoPrecoProduto';
import { v4 as uuidv4 } from 'uuid';

export type Produto = {
  id: string;
  nome: string;
  preco: number;
  codigo_barras?: string;
  marca_id: number | null;
  categoria_id?: string;
  created_at: string;
};

export type ProdutoListagem = Produto & {
  categoria_nome?: string;
  marca_nome?: string;
  quantidade?: number | null;
  unidade?: string | null;
};

export const listProdutos = async (): Promise<ProdutoListagem[]> => {
  const db = await getConnection();

  const rows = await db.getAllAsync<ProdutoListagem>(
    `
        SELECT
          p.id,
          p.nome,
          p.preco,
          p.codigo_barras,
          p.marca_id,
          m.nome AS marca_nome,
          cp.categoria_id,
          c.nome AS categoria_nome,
          p.quantidade,
          p.unidade,
          p.created_at
        FROM produtos p
        LEFT JOIN marcas m ON m.id = p.marca_id
        LEFT JOIN categoria_produto cp ON cp.produto_id = p.id
        LEFT JOIN categorias c ON c.id = cp.categoria_id
        ORDER BY p.created_at DESC
        `,
  );

  return rows;
};

export const insertProduto = async (produto: Produto): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO produtos (id, nome, preco, codigo_barras, marca_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
        `,
    [
      produto.id,
      produto.nome,
      produto.preco,
      produto.codigo_barras ?? null,
      produto.marca_id ?? null,
      produto.created_at,
    ],
  );

  if (produto.categoria_id) {
    await db.runAsync(
      `
        INSERT INTO categoria_produto (id, categoria_id, produto_id, created_at)
        VALUES (?, ?, ?, ?)
        `,
      [uuidv4(), produto.categoria_id, produto.id, new Date().toISOString()],
    );
  }

  // Inserir um novo registro no histórico de preços
  const historico: HistoricoPrecoProduto = {
    id: uuidv4(),
    produto_id: produto.id,
    preco: produto.preco,
    data: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  await insertHistoricoPrecoProduto(historico);
};

export const deleteProdutoById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM produtos WHERE id = ?', [id]);
};

export const getProdutoById = async (id: string): Promise<ProdutoListagem | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<ProdutoListagem>(
    `
        SELECT
          p.id,
          p.nome,
          p.preco,
          p.codigo_barras,
          p.marca_id,
          m.nome AS marca_nome,
          cp.categoria_id,
          c.nome AS categoria_nome,
          p.quantidade,
          p.unidade,
          p.created_at
        FROM produtos p
        LEFT JOIN marcas m ON m.id = p.marca_id
        LEFT JOIN categoria_produto cp ON cp.produto_id = p.id
        LEFT JOIN categorias c ON c.id = cp.categoria_id
        WHERE p.id = ?
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
        SET nome = ?, preco = ?, codigo_barras = ?, marca_id = ?
        WHERE id = ?
        `,
    [
      produto.nome,
      produto.preco,
      produto.codigo_barras ?? null,
      produto.marca_id ?? null,
      produto.id,
    ],
  );

  await db.runAsync('DELETE FROM categoria_produto WHERE produto_id = ?', [produto.id]);

  if (produto.categoria_id) {
    await db.runAsync(
      `
        INSERT INTO categoria_produto (id, categoria_id, produto_id, created_at)
        VALUES (?, ?, ?, ?)
        `,
      [uuidv4(), produto.categoria_id, produto.id, new Date().toISOString()],
    );
  }

  if (produto.preco === produto_oud.preco) {
    return;
  }
  // Inserir um novo registro no histórico de preços
  const historico: HistoricoPrecoProduto = {
    id: uuidv4(),
    produto_id: produto.id,
    preco: produto.preco,
    data: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  await insertHistoricoPrecoProduto(historico);
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
  const historico: HistoricoPrecoProduto = {
    id: uuidv4(),
    produto_id,
    preco,
    data: new Date().toISOString(),
    created_at: new Date().toISOString(),
  };

  await insertHistoricoPrecoProduto(historico);
};
