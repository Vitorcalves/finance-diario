import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, sharedStyles, spacing } from '../../../theme';
import { toCurrency } from '../../../utils/format';
import { Locais } from '../../../utils/local';
import type { GastoPorLocal } from '../types';

type GraficoLocalProps = {
  gastoPorLocal: GastoPorLocal[];
};

/**
 * Cor fixa por local, nunca pela posicao no ranking do mes - senao a cor de
 * cada barra trocaria de mes a mes conforme o gasto sobe ou desce.
 */
const CORES_POR_INDICE = [colors.primary, colors.info, colors.warning, colors.textMuted];

const corDoLocal = (localId: number): string => {
  const indice = Locais.listar().findIndex((local) => local.id === localId);
  return CORES_POR_INDICE[indice % CORES_POR_INDICE.length] ?? colors.primary;
};

/** Gasto do mes somado por local de compra, em barras horizontais. */
export default function GraficoLocal({ gastoPorLocal }: GraficoLocalProps): React.ReactNode {
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
        const largura = `${Math.max(4, (item.gasto / maximo) * 100)}%` as const;

        return (
          <View key={item.localId} style={styles.linha}>
            <View style={styles.cabecalho}>
              <Text style={styles.nome}>{item.descricao}</Text>
              <Text style={styles.valor}>{toCurrency(item.gasto)}</Text>
            </View>

            <View style={styles.barraFundo}>
              <View
                style={[
                  styles.barraPreenchida,
                  { width: largura, backgroundColor: corDoLocal(item.localId) },
                ]}
              />
            </View>

            <Text style={styles.percentual}>{`${Math.round(percentual)}% do gasto do mes`}</Text>
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
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
    color: colors.textBody,
  },
  valor: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  barraFundo: {
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceMuted,
    overflow: 'hidden',
  },
  barraPreenchida: {
    height: '100%',
    borderRadius: radius.sm,
  },
  percentual: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
});
