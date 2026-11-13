import { getConnection } from './database';

/**
 * Consultas de leitura das telas de dashboard.
 *
 * Diferente dos outros models, aqui nao ha insert/update: cada funcao devolve
 * uma serie ja cruzada entre tabelas, pronta para virar grafico. Escrita
 * continua nos models de origem (`itensTransacao`, `historicoPreco`...).
 */

/** Preco unitario efetivamente pago em um item de compra. */
export type PrecoPago = {
  item_id: string;
  transacao_id: string;
  produto_id: string;
  variante_id: string | null;
  empresa_id: string | null;
  /** Preco unitario do item (`itens_transacao.valor`). */
  preco: number;
  quantidade: number;
  /** Data da transacao, no formato YYYY-MM-DD. */
  data: string;
  /** Local da compra; ver `Locais`. */
  local: number;
};

/** Ponto do historico de precos (pagos ou cotados) de um produto. */
export type PrecoHistorico = {
  id: string;
  produto_id: string;
  variante_id: string;
  empresa_id: string | null;
  preco: number;
  /** Data do registro, no formato YYYY-MM-DD (a hora e descartada). */
  data: string;
  /** Local onde o preco foi pago ou cotado; ver `Locais`. */
  local: number;
};

/** Produto que ja aparece em alguma compra ou registro de preco. */
export type ProdutoComMovimento = {
  id: string;
  nome: string;
  compras: number;
  registros: number;
};

/** Compra de uma variante: e ela que da o peso do item na cesta da inflacao pessoal. */
export type CompraVariante = {
  variante_id: string;
  produto_id: string;
  /** Preco unitario x quantidade. */
  total: number;
  /** Data da transacao, no formato YYYY-MM-DD. */
  data: string;
};

/**
 * Todas as compras de itens com variante, da mais antiga para a mais recente.
 * Item sem variante fica de fora: ele nao gera registro no historico de
 * precos, entao nao ha preco para acompanhar.
 */
export const listComprasDeVariantes = async (): Promise<CompraVariante[]> => {
  const db = await getConnection();

  return await db.getAllAsync<CompraVariante>(
    `
        SELECT i.variante_id,
               i.produto_id,
               i.valor * COALESCE(i.quantidade, 1) AS total,
               substr(t.data, 1, 10)               AS data
        FROM itens_transacao i
                 JOIN transacoes t ON t.id = i.transacao_id
        WHERE i.variante_id IS NOT NULL
          AND i.produto_id IS NOT NULL
        ORDER BY t.data, t.created_at
    `,
  );
};

/**
 * Precos pagos por produto: `itens_transacao` cruzado com a data e o local da
 * transacao. Fica de fora da lista a transacao de parcela (`parcela_numero > 0`),
 * que nao carrega itens; a compra em si (`parcela_numero = 0`) entra normalmente.
 */
export const listPrecosPagosPorProduto = async (produtoId: string): Promise<PrecoPago[]> => {
  const db = await getConnection();

  return await db.getAllAsync<PrecoPago>(
    `
        SELECT i.id            AS item_id,
               i.transacao_id,
               i.produto_id,
               i.variante_id,
               t.empresa_id,
               i.valor         AS preco,
               COALESCE(i.quantidade, 1) AS quantidade,
               substr(t.data, 1, 10) AS data,
               t.local
        FROM itens_transacao i
                 JOIN transacoes t ON t.id = i.transacao_id
        WHERE i.produto_id = ?
        ORDER BY t.data, t.created_at
    `,
    [produtoId],
  );
};

/** Historico de precos de um produto, do mais antigo para o mais recente. */
export const listHistoricoPorProduto = async (produtoId: string): Promise<PrecoHistorico[]> => {
  const db = await getConnection();

  return await db.getAllAsync<PrecoHistorico>(
    `
        SELECT id,
               produto_id,
               variante_id,
               empresa_id,
               preco,
               substr(data, 1, 10) AS data,
               local
        FROM historico_preco
        WHERE produto_id = ?
        ORDER BY data, created_at
    `,
    [produtoId],
  );
};

/**
 * Produtos com pelo menos uma compra ou um preco registrado, ordenados pelo
 * mais movimentado. Alimenta o seletor de produto do dashboard: produto sem
 * nenhum dado nao teria o que mostrar.
 */
export const listProdutosComMovimento = async (): Promise<ProdutoComMovimento[]> => {
  const db = await getConnection();

  return await db.getAllAsync<ProdutoComMovimento>(
    `
        SELECT p.id,
               p.nome,
               (SELECT COUNT(*) FROM itens_transacao i WHERE i.produto_id = p.id) AS compras,
               (SELECT COUNT(*) FROM historico_preco h WHERE h.produto_id = p.id) AS registros
        FROM produtos p
        WHERE compras > 0
           OR registros > 0
        ORDER BY compras + registros DESC, p.nome
    `,
  );
};
