export type LocalDefinicao = {
  id: number;
  descricao: string;
};

/**
 * Catalogo fixo de locais de compra, no mesmo espirito de `Unidades`: poucas
 * opcoes, que mudam raramente, sem precisar de tabela propria no banco.
 */
export class Locais {
  /** Usado quando nada e escolhido - a maioria das compras acontece aqui. */
  static readonly padrao = 1;

  private static readonly definicoes: LocalDefinicao[] = [
    { id: 1, descricao: 'Muriaé' },
    { id: 2, descricao: 'Viçosa' },
  ];

  static listar(): LocalDefinicao[] {
    return [...this.definicoes];
  }

  static porId(id: number | null): LocalDefinicao | undefined {
    return this.definicoes.find((local) => local.id === id);
  }

  static descricaoPorId(id: number | null): string {
    return this.porId(id)?.descricao ?? '';
  }
}
