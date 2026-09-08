import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, sharedStyles, spacing } from '../../../theme';
import { toCurrency } from '../../../utils/format';
import type { ComparativoMercado } from '../types';

type ComparativoMercadosProps = {
  mercados: ComparativoMercado[];
  /** Menor total entre os mercados completos; destaca o vencedor. */
  menorTotalCompleto: number | null;
  totalDeItens: number;
};

/** Total do orcamento simulado em cada mercado. */
export default function ComparativoMercados({
  mercados,
  menorTotalCompleto,
  totalDeItens,
}: ComparativoMercadosProps): React.ReactNode {
  if (mercados.length === 0) {
    return null;
  }

  return (
    <>
      <Text style={sharedStyles.sectionTitle}>Comparativo entre mercados</Text>
      <Text style={sharedStyles.sectionHint}>
        Mercados diferentes do selecionado usam o ultimo preco registrado no historico.
      </Text>

      {mercados.map((mercado) => {
        const melhor =
          menorTotalCompleto !== null && mercado.completo && mercado.total === menorTotalCompleto;

        return (
          <View key={mercado.empresaId} style={[styles.card, melhor && sharedStyles.cardHighlight]}>
            <View style={styles.info}>
              <View style={styles.tituloRow}>
                <Text style={styles.nome}>{mercado.nome}</Text>
                {mercado.mercadoDoOrcamento && (
                  <View style={sharedStyles.badge}>
                    <Text style={sharedStyles.badgeText}>Orcamento atual</Text>
                  </View>
                )}
                {melhor && (
                  <View style={[sharedStyles.badge, sharedStyles.badgeSuccess]}>
                    <Text style={sharedStyles.badgeText}>Mais barato</Text>
                  </View>
                )}
              </View>
              <Text style={styles.detalhe}>
                {`${mercado.itensComPreco} de ${totalDeItens} itens com preco`}
              </Text>
            </View>

            <Text style={[styles.total, melhor && sharedStyles.positive]}>
              {toCurrency(mercado.total)}
            </Text>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  info: {
    flex: 1,
  },
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  nome: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  detalhe: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
    marginTop: 2,
  },
  total: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
});
