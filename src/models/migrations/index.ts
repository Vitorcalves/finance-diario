import type { Migration } from './types';
import { migration001 } from './001_initial';
import { migration002 } from './002_item_transacao_variante';
import { migration003 } from './003_planos_pagamento';

export const migrations: Migration[] = [migration001, migration002, migration003];
