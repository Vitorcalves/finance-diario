import { View } from 'react-native';
import { Text } from '../../../components/ui';
import type { TotaisPorTipo } from '../../../models/contas';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../../../theme';
import { toCurrency } from '../../../utils/format';

type ResumoContasProps = {
  totais: TotaisPorTipo;
  /** Quantas contas ativas de cada tipo: o quadro de um tipo sem conta some. */
  quantidade: { caixas: number; reservas: number; cartoes: number };
};

const plural = (quantidade: number, singular: string, varias: string): string =>
  `${quantidade} ${quantidade === 1 ? singular : varias}`;

/**
 * Topo da tela, no formato do resumo de Planos: o saldo atual (o mesmo da
 * Home), o que esta guardado nas reservas e o que esta em aberto nos cartoes.
 * So contas ativas entram.
 */
export default function ResumoContas({ totais, quantidade }: ResumoContasProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();

  const quadros = [
    {
      chave: 'caixas',
      rotulo: 'Saldo atual',
      valor: totais.caixaDisponivel,
      detalhe: plural(quantidade.caixas, 'caixa', 'caixas'),
      negativo: totais.caixaDisponivel < 0,
      visivel: true,
    },
    {
      chave: 'reservas',
      rotulo: 'Reservas',
      valor: totais.totalReservas,
      detalhe: plural(quantidade.reservas, 'reserva', 'reservas'),
      negativo: totais.totalReservas < 0,
      visivel: quantidade.reservas > 0,
    },
    {
      chave: 'cartoes',
      rotulo: 'Cartões',
      // `+ 0` evita o "-R$ 0,00" quando nao ha divida.
      valor: totais.totalFaturasAbertas + 0,
      detalhe: 'em aberto',
      negativo: false,
      visivel: quantidade.cartoes > 0,
    },
  ].filter((quadro) => quadro.visivel);

  return (
    <View style={styles.row}>
      {quadros.map((quadro) => (
        <View key={quadro.chave} style={styles.box}>
          <Text style={styles.label} numberOfLines={1}>
            {quadro.rotulo}
          </Text>
          <Text
            style={[styles.valor, quadro.negativo && { color: colors.danger }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {toCurrency(quadro.valor)}
          </Text>
          <Text style={styles.detalhe} numberOfLines={1}>
            {quadro.detalhe}
          </Text>
        </View>
      ))}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  box: {
    flex: 1,
    backgroundColor: colors.primarySoft,
    borderRadius: radius.xl,
    padding: spacing.md,
  },
  label: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  valor: {
    marginTop: spacing.xs,
    fontSize: fontSize.section,
    fontWeight: fontWeight.heavy,
    color: colors.textStrong,
  },
  detalhe: {
    marginTop: 2,
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
}));
