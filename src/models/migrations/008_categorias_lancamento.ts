import type { SQLiteDatabase } from 'expo-sqlite';
import { Migration } from './types';

/** Categoria que o app ja traz instalada; o usuario pode editar e criar outras. */
type CategoriaPadrao = {
  id: string;
  nome: string;
  icone: string;
  cor: string;
  tipo: 'saida' | 'entrada';
};

/**
 * Categorias que nascem com o app. Os ids sao fixos (e nao UUIDs) para um
 * backup restaurado em outro aparelho continuar apontando para as mesmas.
 */
export const CATEGORIAS_LANCAMENTO_PADRAO: CategoriaPadrao[] = [
  { id: 'mercado', nome: 'Mercado', icone: 'cart-outline', cor: 'verde', tipo: 'saida' },
  {
    id: 'alimentacao',
    nome: 'Restaurantes e delivery',
    icone: 'restaurant-outline',
    cor: 'laranja',
    tipo: 'saida',
  },
  { id: 'transporte', nome: 'Transporte', icone: 'car-outline', cor: 'azul', tipo: 'saida' },
  { id: 'moradia', nome: 'Moradia', icone: 'home-outline', cor: 'violeta', tipo: 'saida' },
  {
    id: 'contas',
    nome: 'Contas da casa',
    icone: 'flash-outline',
    cor: 'amarelo',
    tipo: 'saida',
  },
  { id: 'saude', nome: 'Saúde', icone: 'medkit-outline', cor: 'vermelho', tipo: 'saida' },
  { id: 'lazer', nome: 'Lazer', icone: 'game-controller-outline', cor: 'magenta', tipo: 'saida' },
  { id: 'educacao', nome: 'Educação', icone: 'school-outline', cor: 'aqua', tipo: 'saida' },
  {
    id: 'assinaturas',
    nome: 'Assinaturas',
    icone: 'repeat-outline',
    cor: 'violeta',
    tipo: 'saida',
  },
  { id: 'compras', nome: 'Compras', icone: 'bag-handle-outline', cor: 'aqua', tipo: 'saida' },
  {
    id: 'outros',
    nome: 'Outros',
    icone: 'ellipsis-horizontal-circle-outline',
    cor: 'cinza',
    tipo: 'saida',
  },
  { id: 'salario', nome: 'Salário', icone: 'cash-outline', cor: 'verde', tipo: 'entrada' },
  {
    id: 'renda_extra',
    nome: 'Renda extra',
    icone: 'trending-up-outline',
    cor: 'azul',
    tipo: 'entrada',
  },
  {
    id: 'outras_entradas',
    nome: 'Outras entradas',
    icone: 'add-circle-outline',
    cor: 'cinza',
    tipo: 'entrada',
  },
];

/**
 * Grava as categorias padrao que estiverem faltando. Usado pela migration e
 * depois de importar um backup antigo, que nao traz a tabela.
 */
export const semearCategoriasLancamento = async (db: SQLiteDatabase): Promise<void> => {
  const agora = new Date().toISOString();

  for (const [ordem, categoria] of CATEGORIAS_LANCAMENTO_PADRAO.entries()) {
    await db.runAsync(
      `
          INSERT OR IGNORE INTO categorias_lancamento (id, nome, icone, cor, tipo, ordem, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [categoria.id, categoria.nome, categoria.icone, categoria.cor, categoria.tipo, ordem, agora],
    );
  }
};

/**
 * Categoria do lancamento (Mercado, Transporte, Lazer...).
 *
 * E outra coisa que a categoria de produto: classifica o gasto, nao o que foi
 * comprado. Planos tambem ganham a coluna, para parcelas e assinaturas
 * nascerem ja categorizadas.
 */
export const migration008: Migration = {
  id: 8,
  name: '008_categorias_lancamento',
  up: async (db) => {
    await db.execAsync(`
        CREATE TABLE IF NOT EXISTS categorias_lancamento
        (
            id         TEXT PRIMARY KEY NOT NULL,
            nome       TEXT             NOT NULL,
            icone      TEXT             NOT NULL,
            cor        TEXT             NOT NULL,
            tipo       TEXT             NOT NULL DEFAULT 'saida',
            ordem      INTEGER          NOT NULL DEFAULT 0,
            created_at TEXT             NOT NULL,
            CONSTRAINT chk_categoria_lancamento_tipo CHECK (tipo IN ('saida', 'entrada'))
        );

        ALTER TABLE transacoes
            ADD COLUMN categoria_id TEXT REFERENCES categorias_lancamento (id) ON DELETE SET NULL;

        ALTER TABLE planos_pagamento
            ADD COLUMN categoria_id TEXT REFERENCES categorias_lancamento (id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS ix_transacoes_categoria ON transacoes (categoria_id);
    `);

    await semearCategoriasLancamento(db);

    // Assinatura e a unica categoria que da para deduzir com seguranca.
    await db.execAsync(`
        UPDATE planos_pagamento
        SET categoria_id = 'assinaturas'
        WHERE tipo = 'assinatura';

        UPDATE transacoes
        SET categoria_id = 'assinaturas'
        WHERE plano_id IN (SELECT id FROM planos_pagamento WHERE tipo = 'assinatura');
    `);
  },
  down: async (db) => {
    await db.execAsync(`
        DROP INDEX IF EXISTS ix_transacoes_categoria;

        ALTER TABLE planos_pagamento
            DROP COLUMN categoria_id;
        ALTER TABLE transacoes
            DROP COLUMN categoria_id;

        DROP TABLE IF EXISTS categorias_lancamento;
    `);
  },
};
