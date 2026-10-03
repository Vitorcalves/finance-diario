import type { Migration } from './types';
import { migration001 } from './001_initial';
import { migration002 } from './002_item_transacao_variante';
import { migration003 } from './003_planos_pagamento';
import { migration004 } from './004_unidade_avulsa';
import { migration005 } from './005_vicosa_externo';
import { migration006 } from './006_unidades_granel';
import { migration007 } from './007_produto_eventual';
import { migration008 } from './008_categorias_lancamento';
import { migration009 } from './009_lista_compras';
import { migration010 } from './010_lista_compras_precos';

export const migrations: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
  migration006,
  migration007,
  migration008,
  migration009,
  migration010,
];
