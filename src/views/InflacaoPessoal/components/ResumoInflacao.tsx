import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { Text } from '../../../components/ui';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import { toCurrency } from '../../../utils/format';
import type { InflacaoPessoal } from '../../../utils/inflacaoPessoal';
import { formatarVariacao, mediaMensal, rotuloMes } from '../grafico';

type ResumoInflacaoProps = {
  inflacao: InflacaoPessoal;
  /** Acumulado do periodo, ja garantido pela tela (sem ele o cartao nao aparece). */
  acumulado: number;
  mesBase: string;
};

/** Quanto R$ 100,00 de cesta no mes base custam no fim do periodo. */
const VALOR_DE_EXEMPLO = 100;

/** Cartao com o acumulado do periodo, o ultimo mes, a media e o tamanho da cesta. */
export default function ResumoInflacao({
  inflacao,
  acumulado,
  mesBase,
}: ResumoInflacaoProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const { meses } = inflacao;
  const ultimo = meses[meses.length - 1];
  const subiu = acumulado > 0;
  const caiu = acumulado < 0;
  const corDoSinal = subiu ? colors.danger : caiu ? colors.success : colors.textMuted;

  return (
    <View style={sharedStyles.card}>
      <Text style={styles.label}>
        {`Acumulado em ${meses.length} ${meses.length === 1 ? 'mês' : 'meses'}`}
      </Text>

      <View style={styles.valorRow}>
        <Ionicons
          name={subiu ? 'trending-up' : caiu ? 'trending-down' : 'remove'}
          size={iconSize.xl}
          color={corDoSinal}
        />
        <Text style={[styles.valor, subiu && sharedStyles.negative, caiu && sharedStyles.positive]}>
          {formatarVariacao(acumulado)}
        </Text>
      </View>

      <Text style={styles.periodo}>{`De ${rotuloMes(mesBase)} a ${rotuloMes(ultimo.mes)}`}</Text>

      <Text style={styles.exemplo}>
        {`O que custava ${toCurrency(VALOR_DE_EXEMPLO)} em ${rotuloMes(mesBase)} custa `}
        <Text style={styles.exemploValor}>
          {toCurrency(VALOR_DE_EXEMPLO * (1 + acumulado / 100))}
        </Text>
        {` em ${rotuloMes(ultimo.mes)}.`}
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{`Último mês (${rotuloMes(ultimo.mes, false)})`}</Text>
          <Text style={styles.statValue}>
            {ultimo.variacao === null ? '—' : formatarVariacao(ultimo.variacao)}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Média por mês</Text>
          <Text style={styles.statValue}>
            {formatarVariacao(mediaMensal(acumulado, meses.length))}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Itens na cesta</Text>
          <Text style={styles.statValue}>{inflacao.itens.length}</Text>
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  label: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  valorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  valor: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.heavy,
    color: colors.textStrong,
  },
  periodo: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  exemplo: {
    fontSize: fontSize.small,
    color: colors.textMuted,
  },
  exemploValor: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  statValue: {
    marginTop: 2,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
}));
