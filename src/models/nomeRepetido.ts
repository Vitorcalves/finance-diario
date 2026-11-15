/**
 * Nome unico nos cadastros de marcas, empresas e categorias de produto.
 *
 * Dois cadastros com o mesmo nome viram rotulos iguais no seletor e dividem o
 * que foi registrado: duas marcas "Camil" repartem as variantes entre si. A
 * comparacao nao diferencia maiusculas, acentos nem espacos sobrando, como nas
 * tags.
 *
 * So os ativos contam: o excluido continua no banco (ver `exclusaoLogica`),
 * mas saiu do cadastro e nao impede que o nome seja usado de novo.
 */
import { normalizarTexto } from '../utils/busca';

/** Cadastros com nome unico; o texto entra na mensagem ("Já existe a marca ..."). */
export type CadastroComNome = 'marca' | 'empresa' | 'categoria';

/** O nome ja e usado por outro cadastro ativo. A mensagem e para o usuario. */
export class NomeRepetidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NomeRepetidoError';
  }
}

type Nomeado = { id: string | number; nome: string };

/** O nome como e comparado: "  TIO   joão " e "Tio Joao" dao a mesma chave. */
export const chaveDoNome = (nome: string): string => normalizarTexto(nome).replace(/\s+/g, ' ');

/**
 * Recusa, com `NomeRepetidoError`, o nome que outro registro de `ativos` ja
 * usa. `idEmEdicao` e o do registro que esta sendo editado: ele nao conta como
 * repetido de si mesmo.
 *
 * Editar sem trocar o nome sempre passa. Quem ja tinha dois cadastros iguais
 * antes desta regra ainda consegue mexer no resto (CNPJ, categorias) de cada
 * um; so nao consegue criar um terceiro nem renomear para um nome em uso.
 */
export const exigirNomeLivre = <T extends Nomeado>(
  ativos: T[],
  nome: string,
  cadastro: CadastroComNome,
  idEmEdicao?: T['id'],
): void => {
  const chave = chaveDoNome(nome);
  const emEdicao =
    idEmEdicao === undefined ? undefined : ativos.find((registro) => registro.id === idEmEdicao);

  if (emEdicao && chaveDoNome(emEdicao.nome) === chave) {
    return;
  }

  const repetido = ativos.find(
    (registro) => registro.id !== idEmEdicao && chaveDoNome(registro.nome) === chave,
  );

  if (repetido) {
    throw new NomeRepetidoError(`Já existe a ${cadastro} "${repetido.nome}".`);
  }
};
