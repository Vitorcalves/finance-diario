/** Opcao do seletor de empresa; `oculta` so aparece quando o usuario busca pelo nome. */
export type OpcaoEmpresa = {
  id: string;
  nome: string;
  oculta: boolean;
};

/**
 * Opcoes do seletor de empresa para a categoria escolhida no formulario.
 *
 * A empresa ligada so a outras categorias sai da lista e volta quando o
 * usuario busca pelo nome: o filtro encurta a lista, mas nao impede lancar o
 * que foge da regra. Empresa sem nenhuma categoria aparece sempre, porque
 * ainda nao foi classificada. Sem categoria escolhida, nada e escondido.
 */
export const opcoesDeEmpresa = (
  empresas: { id: string; nome: string }[],
  categoriasPorEmpresa: Map<string, string[]>,
  categoriaId: string | null,
): OpcaoEmpresa[] =>
  empresas.map((empresa) => {
    const categorias = categoriasPorEmpresa.get(empresa.id) ?? [];

    return {
      id: empresa.id,
      nome: empresa.nome,
      oculta: categoriaId !== null && categorias.length > 0 && !categorias.includes(categoriaId),
    };
  });

/**
 * Categoria que o formulario sugere ao escolher a empresa, ou `null`.
 *
 * Se a empresa tem categorias do tipo do lancamento (saida ou entrada), a
 * sugestao sai delas: a usada por ultimo quando e uma delas, senao a unica.
 * Com varias e nenhuma usada ainda, nao ha o que sugerir. Empresa sem
 * categoria ligada continua sugerindo a do ultimo lancamento nela.
 */
export const sugerirCategoriaDaEmpresa = (
  empresaId: string,
  tipo: string,
  categorias: { id: string; tipo: string }[],
  ultimaPorEmpresa: Map<string, string>,
  categoriasPorEmpresa: Map<string, string[]>,
): string | null => {
  const doTipo = new Set(
    categorias.filter((categoria) => categoria.tipo === tipo).map((categoria) => categoria.id),
  );
  const ultima = ultimaPorEmpresa.get(empresaId);
  const ultimaDoTipo = ultima !== undefined && doTipo.has(ultima) ? ultima : null;
  const ligadas = (categoriasPorEmpresa.get(empresaId) ?? []).filter((id) => doTipo.has(id));

  if (ligadas.length === 0) {
    return ultimaDoTipo;
  }

  if (ultimaDoTipo !== null && ligadas.includes(ultimaDoTipo)) {
    return ultimaDoTipo;
  }

  return ligadas.length === 1 ? ligadas[0] : null;
};
