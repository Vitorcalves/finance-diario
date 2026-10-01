import { View } from 'react-native';
import type { ResumoTabela } from '../../../models/backup';
import { fontSize, fontWeight, makeStyles, spacing, useTheme } from '../../../theme';
import { Text } from '../../../components/ui';

type ResumoTabelasProps = {
  titulo: string;
  itens: ResumoTabela[];
};

/** Contagem de registros por tabela, usada na exportacao e na previa da importacao. */
export default function ResumoTabelas({ titulo, itens }: ResumoTabelasProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const total = itens.reduce((soma, item) => soma + item.registros, 0);

  return (
    <View style={sharedStyles.card}>
      <Text style={sharedStyles.sectionTitle}>{titulo}</Text>

      {itens.map((item) => (
        <View key={item.tabela} style={styles.linha}>
          <Text style={styles.tabela}>{item.tabela}</Text>
          <Text style={styles.registros}>{item.registros}</Text>
        </View>
      ))}

      <View style={[styles.linha, styles.linhaTotal]}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValor}>{total}</Text>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  linhaTotal: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  tabela: {
    flex: 1,
    fontSize: fontSize.body,
    color: colors.textMuted,
  },
  registros: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  totalLabel: {
    flex: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  totalValor: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.heavy,
    color: colors.primary,
  },
}));
