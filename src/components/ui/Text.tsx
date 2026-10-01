import { createContext, useContext } from 'react';
import { StyleSheet, Text as RNText, type TextProps } from 'react-native';
import { familiaPorPeso, makeStyles, useTheme } from '../../theme';

/** Marca os textos aninhados, que herdam fonte e cor do texto de fora. */
const DentroDeTexto = createContext(false);

/**
 * Texto padrao do app: aplica a Inter no peso pedido e a cor de texto do tema.
 *
 * Substitui o `Text` do React Native em todas as telas.
 */
export default function Text({ style, children, ...rest }: TextProps): React.ReactNode {
  const { fontesCarregadas } = useTheme();
  const styles = useStyles();
  const aninhado = useContext(DentroDeTexto);
  const plano = StyleSheet.flatten(style) ?? {};

  // Um texto aninhado sem peso proprio herda a familia de quem o envolve.
  const trocarFamilia =
    fontesCarregadas &&
    plano.fontFamily === undefined &&
    (!aninhado || plano.fontWeight !== undefined);

  return (
    <RNText
      {...rest}
      style={[
        !aninhado && styles.base,
        style,
        // A familia ja carrega o peso: manter o `fontWeight` faria o Android
        // engrossar a letra uma segunda vez.
        trocarFamilia && { fontFamily: familiaPorPeso(plano.fontWeight), fontWeight: undefined },
      ]}
    >
      <DentroDeTexto.Provider value>{children}</DentroDeTexto.Provider>
    </RNText>
  );
}

const useStyles = makeStyles((colors) => ({
  base: {
    color: colors.text,
  },
}));
