import type { Migration } from './types';
import { migration001 } from './001_initial';
import { migration002 } from './002_item_transacao_variante';
import { migration003 } from './003_planos_pagamento';
import { migration004 } from './004_unidade_avulsa';
import { migration005 } from './005_vicosa_externo';

export const migrations: Migration[] = [
  migration001,
  migration002,
  migration003,
  migration004,
  migration005,
];
