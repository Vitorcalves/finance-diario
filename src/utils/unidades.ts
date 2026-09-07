export type GrupoUnidade = 'comprimento' | 'massa' | 'volume';

export type UnidadeDefinicao = {
  id: number;
  descricao: string;
  grupo: GrupoUnidade;
  fatorParaPrimaria: number;
  primario: boolean;
};

export class Unidades {
  private static readonly definicoes: UnidadeDefinicao[] = [
    { id: 1, descricao: 'Metros', grupo: 'comprimento', fatorParaPrimaria: 1, primario: true },
    { id: 5, descricao: 'Centímetros', grupo: 'comprimento', fatorParaPrimaria: 0.01, primario: false },
    { id: 2, descricao: 'Quilogramas', grupo: 'massa', fatorParaPrimaria: 1, primario: true },
    { id: 4, descricao: 'Gramas', grupo: 'massa', fatorParaPrimaria: 0.001, primario: false },
    { id: 3, descricao: 'Litros', grupo: 'volume', fatorParaPrimaria: 1, primario: true },
    { id: 6, descricao: 'Mililitros', grupo: 'volume', fatorParaPrimaria: 0.001, primario: false },
  ];

  static listar(): UnidadeDefinicao[] {
    return [...this.definicoes];
  }

  static porId(id: number | null): UnidadeDefinicao | undefined {
    return this.definicoes.find((unidade) => unidade.id === id);
  }

  static descricaoPorId(id: number | null): string {
    return this.porId(id)?.descricao ?? '';
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
