import {getConnection} from './database';

export type ProdutoVariantes = {
  id: string;
  produto_id: string;
  marca_id: number | null;
  unidade_id: number | null;
  quantidade: number | null;
  codigo_barras: string | null;
  preco: number;
  created_at: string;
};

export const listProdutoVariantes = async (): Promise<ProdutoVariantes[]> => {
  const db = await getConnection();

  return await db.getAllAsync<ProdutoVariantes>(
    `
        SELECT id,
               produto_id,
               marca_id,
               unidade_id,
               quantidade,
               codigo_barras,
               preco,
               created_at
        FROM produto_variantes
        ORDER BY created_at DESC
    `,
  );
};

export const insertProdutoVariantes = async (produto: ProdutoVariantes): Promise<void> => {
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
      produto.created_at
    ],
  );
};

export const deleteProdutoVariantesById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM produto_variantes   WHERE id = ?', [id]);
};

export const updateProdutoVariantes = async (variante: ProdutoVariantes): Promise<void> => {
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

export const getProdutoVariantesById = async (id: string): Promise<ProdutoVariantes | null> => {
  const db = await getConnection();
  const row = await db.getFirstAsync<ProdutoVariantes>(
    `
        SELECT id,
               produto_id,
               marca_id,
               unidade_id,
               quantidade,
               codigo_barras,
               preco,
               created_at
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
