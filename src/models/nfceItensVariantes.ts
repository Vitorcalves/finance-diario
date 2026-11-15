import { getConnection } from './database';

/**
 * De-para dos itens da nota fiscal (NFC-e) para os produtos do app, por
 * empresa (migration 021). O codigo do item na nota e o do cadastro da loja,
 * por isso vale so dentro da mesma empresa.
 *
 * Aprende ao lancar: o item que veio da nota e saiu ligado a um produto grava
 * (ou atualiza) a linha. Na proxima nota da mesma loja o item ja vem ligado.
 * Quem le confere se o produto e a variante continuam ativos.
 */
export type DeParaItemNfce = {
  empresa_id: string;
  /** Codigo do item na nota ou, sem codigo, a descricao normalizada (`chaveDoItemNota`). */
  chave_item: string;
  produto_id: string;
  variante_id: string | null;
  created_at: string;
  updated_at: string;
};

/** Todas as linhas do de-para, de todas as empresas. */
export const listDeParaItensNfce = async (): Promise<DeParaItemNfce[]> => {
  const db = await getConnection();

  return await db.getAllAsync<DeParaItemNfce>(
    `
        SELECT empresa_id, chave_item, produto_id, variante_id, created_at, updated_at
        FROM nfce_itens_variantes
    `,
  );
};

/** Grava ou atualiza a ligacao de um item da nota com o produto (e a variante). */
export const gravarDeParaItemNfce = async (
  ligacao: {
    empresaId: string;
    chaveItem: string;
    produtoId: string;
    varianteId: string | null;
  },
  agora: string = new Date().toISOString(),
): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO nfce_itens_variantes (empresa_id, chave_item, produto_id, variante_id, created_at,
                                          updated_at)
        VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT (empresa_id, chave_item) DO UPDATE SET produto_id  = excluded.produto_id,
                                                           variante_id = excluded.variante_id,
                                                           updated_at  = excluded.updated_at
    `,
    [ligacao.empresaId, ligacao.chaveItem, ligacao.produtoId, ligacao.varianteId, agora, agora],
  );
};
