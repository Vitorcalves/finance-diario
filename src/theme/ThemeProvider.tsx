import { createContext, type ReactNode, useContext, useEffect, useMemo } from 'react';
import { Appearance, StyleSheet, useColorScheme } from 'react-native';
import { type CorCategoria, coresCategoria, type EsquemaCor, type Paleta, paletas } from './colors';
import { criarSharedStyles, type SharedStyles } from './styles';
import { criarTipografia, type Tipografia } from './typography';

/** Escolha do usuario no menu; `sistema` segue o modo claro/escuro do aparelho. */
export type PreferenciaTema = 'sistema' | 'claro' | 'escuro';

export type Tema = {
  esquema: EsquemaCor;
  escuro: boolean;
  colors: Paleta;
  typography: Tipografia;
  sharedStyles: SharedStyles;
  /** Cor de uma categoria de lancamento pela chave gravada; `cinza` se desconhecida. */
  corCategoria: (chave: string | null | undefined) => string;
};

type ContextoTema = Tema & {
  preferencia: PreferenciaTema;
  setPreferencia: (preferencia: PreferenciaTema) => void;
  /** `false` enquanto a Inter nao carregou: o texto fica na fonte do sistema. */
  fontesCarregadas: boolean;
};

const criarTema = (esquema: EsquemaCor): Tema => {
  const colors = paletas[esquema];
  const typography = criarTipografia(colors);

  const cores = coresCategoria[esquema];

  return {
    esquema,
    escuro: esquema === 'dark',
    colors,
    typography,
    sharedStyles: criarSharedStyles(colors, typography),
    corCategoria: (chave) => cores[(chave ?? 'cinza') as CorCategoria] ?? cores.cinza,
  };
};

/** Os dois temas sao montados uma vez: trocar de modo nao recria nenhum estilo. */
const temas: Record<EsquemaCor, Tema> = {
  light: criarTema('light'),
  dark: criarTema('dark'),
};

const Contexto = createContext<ContextoTema>({
  ...temas.light,
  preferencia: 'sistema',
  setPreferencia: () => undefined,
  fontesCarregadas: false,
});

const esquemaDaPreferencia = (
  preferencia: PreferenciaTema,
  sistema: ReturnType<typeof useColorScheme>,
): EsquemaCor => {
  if (preferencia === 'claro') {
    return 'light';
  }

  if (preferencia === 'escuro') {
    return 'dark';
  }

  return sistema === 'dark' ? 'dark' : 'light';
};

type ThemeProviderProps = {
  preferencia: PreferenciaTema;
  /** Chamado a cada troca feita no menu; quem usa o provider guarda a escolha. */
  onAlterarPreferencia: (preferencia: PreferenciaTema) => void;
  fontesCarregadas: boolean;
  children: ReactNode;
};

/** Entrega paleta, tipografia e estilos compartilhados do modo atual. */
export function ThemeProvider({
  preferencia,
  onAlterarPreferencia,
  fontesCarregadas,
  children,
}: ThemeProviderProps): React.ReactNode {
  const sistema = useColorScheme();

  // Alertas, teclado e seletores nativos seguem o `Appearance`: forcar o modo
  // aqui mantem esses componentes da mesma cor do app.
  useEffect(() => {
    Appearance.setColorScheme(
      preferencia === 'sistema' ? null : preferencia === 'escuro' ? 'dark' : 'light',
    );
  }, [preferencia]);

  const valor = useMemo(
    (): ContextoTema => ({
      ...temas[esquemaDaPreferencia(preferencia, sistema)],
      preferencia,
      setPreferencia: onAlterarPreferencia,
      fontesCarregadas,
    }),
    [preferencia, sistema, onAlterarPreferencia, fontesCarregadas],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useTheme = (): ContextoTema => useContext(Contexto);

/**
 * Cria o hook de estilos de um componente a partir da paleta.
 *
 *   const useStyles = makeStyles((colors) => ({ titulo: { color: colors.textStrong } }));
 *   ...
 *   const styles = useStyles();
 *
 * O resultado fica em cache por paleta, entao o `StyleSheet` de cada modo e
 * criado uma unica vez.
 */
export function makeStyles<T extends StyleSheet.NamedStyles<T>>(
  fabrica: (colors: Paleta) => T,
): () => T {
  const cache = new Map<Paleta, T>();

  return function useStyles(): T {
    const { colors } = useTheme();
    let estilos = cache.get(colors);

    if (!estilos) {
      estilos = StyleSheet.create(fabrica(colors));
      cache.set(colors, estilos);
    }

    return estilos;
  };
}
