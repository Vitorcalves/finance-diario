/**
 * Paletas do app. Nenhuma tela declara cor em hexadecimal: tudo vem de um
 * token daqui, lido pelo `useTheme()` - e isso que permite o modo escuro sem
 * mexer nas telas.
 */
const paletaClara = {
  // Marca
  primary: '#0f7a5b',
  /** Marca mais intensa: destaque de "hoje" nos graficos e estados pressionados. */
  primaryStrong: '#0a5640',
  primarySoft: '#e2f2ea',
  /** Texto e icone sobre fundo `primary`, `success` ou `danger`. */
  onPrimary: '#ffffff',

  // Superficies
  background: '#f2f5f3',
  surface: '#ffffff',
  surfaceMuted: '#f0f4f2',
  overlay: 'rgba(10, 25, 20, 0.45)',
  overlayStrong: 'rgba(0, 0, 0, 0.55)',

  // Bordas
  border: '#e1e9e5',
  borderStrong: '#cfdbd5',
  divider: '#ebf0ed',

  // Texto
  textStrong: '#0e2a21',
  text: '#1c3a30',
  textMuted: '#5b6f67',
  textSubtle: '#8aa198',
  placeholder: '#9aaea6',

  // Estados
  success: '#0d8f50',
  successSoft: '#e2f4e9',
  danger: '#c8382e',
  dangerSoft: '#fdeeec',
  dangerBorder: '#f6cbc6',
  warning: '#c98a05',
  warningSoft: '#fdf3dc',
  info: '#2457d6',
  infoSoft: '#e6eefe',
  infoBorder: '#c5d6fa',
  disabled: '#b7c6c0',
  onDisabled: '#ffffff',

  // Cartao de destaque da Home (gradiente)
  heroStart: '#12885f',
  heroEnd: '#0a4a37',
  onHero: '#ffffff',
  onHeroMuted: 'rgba(255, 255, 255, 0.78)',
  heroTrack: 'rgba(255, 255, 255, 0.22)',
};

export type Paleta = { [Token in keyof typeof paletaClara]: string };

export type ColorToken = keyof Paleta;

const paletaEscura: Paleta = {
  primary: '#3cc495',
  primaryStrong: '#7be0bb',
  primarySoft: '#173a2e',
  onPrimary: '#05170f',

  background: '#0b1210',
  surface: '#141d1a',
  surfaceMuted: '#1b2622',
  overlay: 'rgba(0, 0, 0, 0.6)',
  overlayStrong: 'rgba(0, 0, 0, 0.7)',

  border: '#24332e',
  borderStrong: '#30433c',
  divider: '#1f2b27',

  textStrong: '#eef5f1',
  text: '#d2dfd9',
  textMuted: '#94a9a1',
  textSubtle: '#6c837a',
  placeholder: '#5c716a',

  success: '#3fcf86',
  successSoft: '#143325',
  danger: '#f26b60',
  dangerSoft: '#3a1b19',
  dangerBorder: '#5e2a26',
  warning: '#e8b03f',
  warningSoft: '#3a2d10',
  info: '#79a7ff',
  infoSoft: '#162540',
  infoBorder: '#27406d',
  disabled: '#33433d',
  onDisabled: '#7d8f88',

  heroStart: '#137352',
  heroEnd: '#0a352a',
  onHero: '#ffffff',
  onHeroMuted: 'rgba(255, 255, 255, 0.72)',
  heroTrack: 'rgba(255, 255, 255, 0.18)',
};

export type EsquemaCor = 'light' | 'dark';

export const paletas: Record<EsquemaCor, Paleta> = {
  light: paletaClara,
  dark: paletaEscura,
};

/**
 * Cores das categorias de lancamento. A cor segue a categoria (nunca a
 * posicao no ranking), e o nome da categoria aparece sempre junto - a cor nao
 * carrega a informacao sozinha.
 *
 * As oito primeiras sao a paleta categorica validada para daltonismo nos dois
 * modos; `cinza` e o neutro de "Outros" e "Sem categoria".
 */
export type CorCategoria =
  | 'azul'
  | 'laranja'
  | 'aqua'
  | 'amarelo'
  | 'magenta'
  | 'verde'
  | 'violeta'
  | 'vermelho'
  | 'cinza';

export const CORES_CATEGORIA: CorCategoria[] = [
  'azul',
  'laranja',
  'aqua',
  'amarelo',
  'magenta',
  'verde',
  'violeta',
  'vermelho',
  'cinza',
];

export const coresCategoria: Record<EsquemaCor, Record<CorCategoria, string>> = {
  light: {
    azul: '#2a78d6',
    laranja: '#eb6834',
    aqua: '#1baf7a',
    amarelo: '#eda100',
    magenta: '#e87ba4',
    verde: '#008300',
    violeta: '#4a3aa7',
    vermelho: '#e34948',
    cinza: '#8a948f',
  },
  dark: {
    azul: '#3987e5',
    laranja: '#d95926',
    aqua: '#199e70',
    amarelo: '#c98500',
    magenta: '#d55181',
    verde: '#008300',
    violeta: '#9085e9',
    vermelho: '#e66767',
    cinza: '#7d8a84',
  },
};
