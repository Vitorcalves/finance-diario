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
import { migration011 } from './011_lista_compras_preco_variante';
import { migration012 } from './012_contas_cartoes_reservas';
import { migration013 } from './013_plano_conta';
import { migration014 } from './014_entrada_programada';
import { migration015 } from './015_natureza_transacao';
import { migration016 } from './016_lista_compras_cotacoes';

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
  migration011,
  migration012,
  migration013,
  migration014,
  migration015,
  migration016,
];
