import { View } from 'react-native';
import { Text } from '../../../components/ui';
import { fontSize, makeStyles, spacing, useTheme } from '../../../theme';
import { JANELA_PESOS } from '../../../utils/inflacaoPessoal';

const REGRAS = [
  'Cada item é um produto com marca e embalagem (a variante): a comparação é sempre do mesmo item, e não de uma troca de marca.',
  'O preço do mês é a média do histórico de preços, pagos e cotados. Mês sem registro repete o último preço, e a mudança aparece quando o item volta a ter preço.',
  `O peso de cada item é quanto você gastou nele nos últimos ${JANELA_PESOS} meses. Item só cotado, nunca comprado, fica fora da cesta.`,
  'O impacto, em pontos percentuais (p.p.), é quanto o item sozinho mexeu no acumulado; a soma dos impactos é o acumulado.',
];

/** Explica a conta: o numero e uma estimativa e depende do que foi registrado. */
export default function ComoCalculado(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();

  return (
    <View style={sharedStyles.card}>
      <Text style={sharedStyles.sectionTitle}>Como é calculado</Text>

      {REGRAS.map((regra) => (
        <View key={regra} style={styles.linha}>
          <Text style={styles.marcador}>•</Text>
          <Text style={styles.texto}>{regra}</Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  linha: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  marcador: {
    fontSize: fontSize.small,
    color: colors.textSubtle,
  },
  texto: {
    flex: 1,
    fontSize: fontSize.small,
    color: colors.textMuted,
  },
}));
