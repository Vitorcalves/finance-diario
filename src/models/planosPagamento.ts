import type { FrequenciaPlano } from '../utils/parcelas';
import { getConnection } from './database';

export type TipoPlano = 'parcelamento' | 'assinatura';

/**
 * A regra de um gasto recorrente.
 *
 * `parcelamento` tem fim conhecido (`total_parcelas`) e e gerado por inteiro no
 * lancamento; `assinatura` e aberta e vai sendo materializada conforme o tempo
 * passa, com `gerado_ate` marcando ate onde o gerador ja chegou.
 */
export type PlanoPagamento = {
  id: string;
  tipo: TipoPlano;
  descricao: string;
  empresa_id?: string | null;
  /** Ja com sinal, igual a `transacoes`: negativo e saida. */
  valor_parcela: number;
  /** Total da compra parcelada; `null` na assinatura. */
  valor_total?: number | null;
  /** `null` na assinatura, que nao tem fim previsto. */
  total_parcelas?: number | null;
  frequencia: FrequenciaPlano;
  intervalo: number;
  /** Data da primeira cobranca; ancora de todo o calendario do plano. */
  data_inicio: string;
  /** Encerramento (cancelamento); nada e cobrado depois dela. */
  data_fim?: string | null;
  ativo: number;
  /** Watermark do gerador: ultima data ja materializada. */
  gerado_ate?: string | null;
  /** Categoria herdada por todas as cobrancas do plano. */
  categoria_id?: string | null;
  created_at: string;
};

const COLUNAS = `id, tipo, descricao, empresa_id, valor_parcela, valor_total, total_parcelas,
                 frequencia, intervalo, data_inicio, data_fim, ativo, gerado_ate, categoria_id,
                 created_at`;

export const listPlanos = async (): Promise<PlanoPagamento[]> => {
  const db = await getConnection();

  return await db.getAllAsync<PlanoPagamento>(
    `
        SELECT ${COLUNAS}
        FROM planos_pagamento
        ORDER BY ativo DESC, data_inicio DESC
    `,
  );
};

export const listPlanosAtivos = async (): Promise<PlanoPagamento[]> => {
  const db = await getConnection();

  return await db.getAllAsync<PlanoPagamento>(
    `
        SELECT ${COLUNAS}
        FROM planos_pagamento
        WHERE ativo = 1
        ORDER BY data_inicio
    `,
  );
};

export const getPlanoById = async (id: string): Promise<PlanoPagamento | null> => {
  const db = await getConnection();

  return await db.getFirstAsync<PlanoPagamento>(
    `
        SELECT ${COLUNAS}
        FROM planos_pagamento
        WHERE id = ?
    `,
    [id],
  );
};

export const insertPlano = async (plano: PlanoPagamento): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        INSERT INTO planos_pagamento (id, tipo, descricao, empresa_id, valor_parcela, valor_total,
                                      total_parcelas, frequencia, intervalo, data_inicio, data_fim,
                                      ativo, gerado_ate, categoria_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      plano.id,
      plano.tipo,
      plano.descricao,
      plano.empresa_id ?? null,
      plano.valor_parcela,
      plano.valor_total ?? null,
      plano.total_parcelas ?? null,
      plano.frequencia,
      plano.intervalo,
      plano.data_inicio,
      plano.data_fim ?? null,
      plano.ativo,
      plano.gerado_ate ?? null,
      plano.categoria_id ?? null,
      plano.created_at,
    ],
  );
};

export const updatePlano = async (plano: PlanoPagamento): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        UPDATE planos_pagamento
        SET descricao      = ?,
            empresa_id     = ?,
            valor_parcela  = ?,
            valor_total    = ?,
            total_parcelas = ?,
            frequencia     = ?,
            intervalo      = ?,
            data_inicio    = ?,
            data_fim       = ?,
            ativo          = ?,
            gerado_ate     = ?,
            categoria_id   = ?
        WHERE id = ?
    `,
    [
      plano.descricao,
      plano.empresa_id ?? null,
      plano.valor_parcela,
      plano.valor_total ?? null,
      plano.total_parcelas ?? null,
      plano.frequencia,
      plano.intervalo,
      plano.data_inicio,
      plano.data_fim ?? null,
      plano.ativo,
      plano.gerado_ate ?? null,
      plano.categoria_id ?? null,
      plano.id,
    ],
  );
};

export const atualizarGeradoAte = async (planoId: string, geradoAte: string): Promise<void> => {
  const db = await getConnection();

  await db.runAsync(
    `
        UPDATE planos_pagamento
        SET gerado_ate = ?
        WHERE id = ?
          AND (gerado_ate IS NULL OR gerado_ate < ?)
    `,
    [geradoAte, planoId, geradoAte],
  );
};

/** As transacoes do plano caem junto, por `ON DELETE CASCADE`. */
export const deletePlanoById = async (id: string): Promise<void> => {
  const db = await getConnection();
  await db.runAsync('DELETE FROM planos_pagamento WHERE id = ?', [id]);
};
