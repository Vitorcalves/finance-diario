/**
 * Substituto de `expo-file-system/legacy` para os testes: um sistema de
 * arquivos em memoria, so com as funcoes que o codigo testado usa.
 *
 * Entra como o de `expo-sqlite`, pelo alias do `tsconfig.test.json`. Imita o
 * aparelho onde o teste depende disso: gravar numa pasta que nao existe falha,
 * e listar uma pasta devolve so os nomes, sem o caminho.
 */

const DOCUMENTOS = 'file:///documentos/';

export const documentDirectory: string | null = DOCUMENTOS;

/** Conteudo de cada arquivo, pelo caminho completo. */
const arquivos = new Map<string, string>();

/** Pastas que existem, sempre terminadas em `/`. */
const pastas = new Set<string>([DOCUMENTOS]);

type Funcao = 'makeDirectoryAsync' | 'writeAsStringAsync' | 'readDirectoryAsync' | 'deleteAsync';

const falhas = new Map<Funcao, Error>();

/** Volta ao sistema de arquivos vazio, so com a pasta de documentos. Use no `beforeEach`. */
export const __novoSistemaDeArquivos = (): void => {
  arquivos.clear();
  pastas.clear();
  pastas.add(DOCUMENTOS);
  falhas.clear();
};

/** Daqui ate o proximo `__novoSistemaDeArquivos`, toda chamada de `funcao` falha com `erro`. */
export const __falharEm = (funcao: Funcao, erro: Error): void => {
  falhas.set(funcao, erro);
};

const conferirFalha = (funcao: Funcao): void => {
  const erro = falhas.get(funcao);

  if (erro) {
    throw erro;
  }
};

const comBarra = (uri: string): string => (uri.endsWith('/') ? uri : `${uri}/`);

/** Pasta onde `uri` (arquivo ou pasta) esta, terminada em `/`. */
const pastaDe = (uri: string): string => {
  const semBarraFinal = uri.endsWith('/') ? uri.slice(0, -1) : uri;
  return semBarraFinal.slice(0, semBarraFinal.lastIndexOf('/') + 1);
};

export const makeDirectoryAsync = async (
  uri: string,
  opcoes: { intermediates?: boolean } = {},
): Promise<void> => {
  conferirFalha('makeDirectoryAsync');
  const pasta = comBarra(uri);

  // Como no aparelho: com `intermediates`, pasta que ja existe nao e erro e as
  // de cima que faltarem sao criadas junto.
  if (!opcoes.intermediates && (pastas.has(pasta) || !pastas.has(pastaDe(pasta)))) {
    throw new Error(`Directory '${uri}' could not be created or already exists.`);
  }

  for (let atual = pasta; !pastas.has(atual) && atual !== 'file:///'; atual = pastaDe(atual)) {
    pastas.add(atual);
  }
};

export const writeAsStringAsync = async (uri: string, conteudo: string): Promise<void> => {
  conferirFalha('writeAsStringAsync');

  if (!pastas.has(pastaDe(uri))) {
    throw new Error(`Location '${uri}' isn't writable.`);
  }

  arquivos.set(uri, conteudo);
};

export const readAsStringAsync = async (uri: string): Promise<string> => {
  const conteudo = arquivos.get(uri);

  if (conteudo === undefined) {
    throw new Error(`File '${uri}' could not be read.`);
  }

  return conteudo;
};

/** So os campos que o codigo testado le; o real tambem traz tamanho e data. */
export const getInfoAsync = async (
  uri: string,
): Promise<{ exists: boolean; isDirectory: boolean; uri: string }> => {
  if (arquivos.has(uri)) {
    return { exists: true, isDirectory: false, uri };
  }

  return { exists: pastas.has(comBarra(uri)), isDirectory: pastas.has(comBarra(uri)), uri };
};

export const readDirectoryAsync = async (uri: string): Promise<string[]> => {
  conferirFalha('readDirectoryAsync');
  const pasta = comBarra(uri);

  if (!pastas.has(pasta)) {
    throw new Error(`Directory '${uri}' could not be read.`);
  }

  return [...arquivos.keys(), ...pastas]
    .filter((caminho) => caminho !== pasta && pastaDe(caminho) === pasta)
    .map((caminho) => caminho.slice(pasta.length).replace(/\/$/, ''));
};

/** So apaga arquivo: o codigo testado nao apaga pastas. */
export const deleteAsync = async (
  uri: string,
  opcoes: { idempotent?: boolean } = {},
): Promise<void> => {
  conferirFalha('deleteAsync');

  if (!arquivos.delete(uri) && !opcoes.idempotent) {
    throw new Error(`File '${uri}' could not be deleted because it could not be found.`);
  }
};
