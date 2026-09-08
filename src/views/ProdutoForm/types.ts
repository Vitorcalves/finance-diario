/** Variante enquanto esta sendo editada no formulario (valores como texto). */
export type VarianteFormItem = {
  /** Chave estavel da lista, mesmo antes de existir no banco. */
  localId: string;
  /** Id no banco; `null` quando a variante ainda nao foi salva. */
  id: string | null;
  marcaId: number | null;
  unidadeId: number | null;
  quantidade: string;
  codigoBarras: string;
  preco: string;
};

/** Campos preenchidos no mini formulario de variante. */
export type DadosVariante = Omit<VarianteFormItem, 'localId' | 'id'>;
