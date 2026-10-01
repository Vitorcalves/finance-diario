import { View } from 'react-native';
import { fontSize, fontWeight, makeStyles, type Paleta, spacing, useTheme } from '../../../theme';
import { toCurrency } from '../../../utils/format';
import { Locais } from '../../../utils/local';
import type { GastoPorLocal } from '../types';
import { BarraProgresso, Text } from '../../../components/ui';

type GraficoLocalProps = {
  gastoPorLocal: GastoPorLocal[];
};

/**
 * Cor fixa por local, nunca pela posicao no ranking do mes - senao a cor de
 * cada barra trocaria de mes a mes conforme o gasto sobe ou desce.
 */
const corDoLocal = (localId: number, colors: Paleta): string => {
  const cores = [colors.primary, colors.info, colors.warning, colors.textMuted];
  const indice = Locais.listar().findIndex((local) => local.id === localId);
  return cores[indice % cores.length] ?? colors.primary;
};

/** Gasto do mes somado por local de compra, em barras horizontais. */
export default function GraficoLocal({ gastoPorLocal }: GraficoLocalProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  if (gastoPorLocal.length === 0) {
    return null;
  }

  const total = gastoPorLocal.reduce((soma, item) => soma + item.gasto, 0);
  const maximo = Math.max(...gastoPorLocal.map((item) => item.gasto), 1);

  return (
    <View style={sharedStyles.card}>
      <Text style={sharedStyles.sectionTitle}>Por localidade</Text>

      {gastoPorLocal.map((item) => {
        const percentual = total > 0 ? (item.gasto / total) * 100 : 0;

        return (
          <View key={item.localId} style={styles.linha}>
            <View style={styles.cabecalho}>
              <Text style={styles.nome}>{item.descricao}</Text>
              <Text style={styles.valor}>{toCurrency(item.gasto)}</Text>
            </View>

            <BarraProgresso
              total={maximo}
              altura={10}
              segmentos={[{ valor: item.gasto, cor: corDoLocal(item.localId, colors) }]}
            />

            <Text style={styles.percentual}>{`${Math.round(percentual)}% do gasto do mês`}</Text>
          </View>
        );
      })}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  linha: {
    gap: spacing.xs,
  },
  cabecalho: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  nome: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  valor: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  percentual: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
}));
