export type GrupoUnidade = 'comprimento' | 'massa' | 'volume' | 'unidade';

export type UnidadeDefinicao = {
  id: number;
  descricao: string;
  /** Forma curta usada nos precos por unidade (ex.: `R$ 9,99/kg`). */
  sigla: string;
  grupo: GrupoUnidade;
  fatorParaPrimaria: number;
  primario: boolean;
  /**
   * Venda a granel (tomate, carne, tecido): nao ha embalagem, o preco e por
   * `quantidade` dessa medida e o item do lancamento aceita peso fracionado.
   */
  granel: boolean;
};

export class Unidades {
  private static readonly definicoes: UnidadeDefinicao[] = [
    {
      id: 1,
      descricao: 'Metros',
      sigla: 'm',
      grupo: 'comprimento',
      fatorParaPrimaria: 1,
      primario: true,
      granel: false,
    },
    {
      id: 5,
      descricao: 'Centímetros',
      sigla: 'cm',
      grupo: 'comprimento',
      fatorParaPrimaria: 0.01,
      primario: false,
      granel: false,
    },
    {
      id: 2,
      descricao: 'Quilogramas',
      sigla: 'kg',
      grupo: 'massa',
      fatorParaPrimaria: 1,
      primario: true,
      granel: false,
    },
    {
      id: 4,
      descricao: 'Gramas',
      sigla: 'g',
      grupo: 'massa',
      fatorParaPrimaria: 0.001,
      primario: false,
      granel: false,
    },
    {
      id: 3,
      descricao: 'Litros',
      sigla: 'L',
      grupo: 'volume',
      fatorParaPrimaria: 1,
      primario: true,
      granel: false,
    },
    {
      id: 6,
      descricao: 'Mililitros',
      sigla: 'mL',
      grupo: 'volume',
      fatorParaPrimaria: 0.001,
      primario: false,
      granel: false,
    },
    {
      id: 7,
      descricao: 'Unidade',
      sigla: 'un',
      grupo: 'unidade',
      fatorParaPrimaria: 1,
      primario: true,
      granel: false,
    },
    {
      id: 8,
      descricao: 'Quilo (granel)',
      sigla: 'kg',
      grupo: 'massa',
      fatorParaPrimaria: 1,
      primario: false,
      granel: true,
    },
    {
      id: 9,
      descricao: 'Litro (granel)',
      sigla: 'L',
      grupo: 'volume',
      fatorParaPrimaria: 1,
      primario: false,
      granel: true,
    },
    {
      id: 10,
      descricao: 'Metro (granel)',
      sigla: 'm',
      grupo: 'comprimento',
      fatorParaPrimaria: 1,
      primario: false,
      granel: true,
    },
  ];

  static listar(): UnidadeDefinicao[] {
    return [...this.definicoes];
  }

  static porId(id: number | null): UnidadeDefinicao | undefined {
    return this.definicoes.find((unidade) => unidade.id === id);
  }

  /** `true` para as unidades de venda a granel (Quilo (granel), Litro (granel)...). */
  static ehGranel(id: number | null): boolean {
    return this.porId(id)?.granel ?? false;
  }

  static descricaoPorId(id: number | null): string {
    return this.porId(id)?.descricao ?? '';
  }

  /** Unidade primaria do mesmo grupo de `id` (Gramas -> Quilogramas, mL -> Litros). */
  static primariaDe(id: number | null): UnidadeDefinicao | undefined {
    const unidade = this.porId(id);

    if (!unidade) {
      return undefined;
    }

    return this.definicoes.find((item) => item.grupo === unidade.grupo && item.primario);
  }

  static mesmoGrupo(idA: number, idB: number): boolean {
    const a = this.porId(idA);
    const b = this.porId(idB);
    return Boolean(a && b && a.grupo === b.grupo);
  }

  static converter(valor: number, deId: number, paraId: number): number {
    const de = this.porId(deId);
    const para = this.porId(paraId);

    if (!de || !para) {
      throw new Error('Unidade inválida para conversão');
    }

    if (de.grupo !== para.grupo) {
      throw new Error(`Não é possível converter de ${de.descricao} para ${para.descricao}`);
    }

    const valorNaUnidadePrimaria = valor * de.fatorParaPrimaria;
    return valorNaUnidadePrimaria / para.fatorParaPrimaria;
  }
}
