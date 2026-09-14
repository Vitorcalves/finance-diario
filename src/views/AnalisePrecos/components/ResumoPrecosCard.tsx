import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize, fontWeight, radius, sharedStyles, spacing } from '../../../theme';
import { toCurrency, toPercent } from '../../../utils/format';
import type { ResumoPrecos } from '../types';

type ResumoPrecosCardProps = {
  resumo: ResumoPrecos;
};

const SEM_VALOR = '—';

const moeda = (valor: number | null): string => (valor === null ? SEM_VALOR : toCurrency(valor));

/** Numeros-chave do produto: ultimo pago, variacao, faixa e ultimo registro. */
export default function ResumoPrecosCard({ resumo }: ResumoPrecosCardProps): React.ReactNode {
  const variacao = resumo.variacaoPago;

  return (
    <View style={sharedStyles.card}>
      <View style={styles.linha}>
        <View style={styles.bloco}>
          <Text style={styles.rotulo}>Ultimo pago</Text>
          <Text style={styles.valorDestaque}>{moeda(resumo.ultimoPago)}</Text>
          {variacao !== null && (
            <Text
              style={[
                styles.variacao,
                variacao > 0 ? sharedStyles.negative : variacao < 0 ? sharedStyles.positive : null,
              ]}
            >
              {`${toPercent(variacao)} vs. compra anterior`}
            </Text>
          )}
        </View>

        <View style={styles.bloco}>
          <Text style={styles.rotulo}>Ultimo no historico</Text>
          <Text style={styles.valorDestaqueHistorico}>{moeda(resumo.ultimoHistorico)}</Text>
          <Text style={styles.variacao}>{`${resumo.registros} registro(s)`}</Text>
        </View>
      </View>

      <View style={styles.faixa}>
        <View style={styles.faixaItem}>
          <Text style={styles.rotulo}>Menor pago</Text>
          <Text style={styles.valor}>{moeda(resumo.menorPago)}</Text>
        </View>
        <View style={styles.faixaItem}>
          <Text style={styles.rotulo}>Maior pago</Text>
          <Text style={styles.valor}>{moeda(resumo.maiorPago)}</Text>
        </View>
        <View style={styles.faixaItem}>
          <Text style={styles.rotulo}>Compras</Text>
          <Text style={styles.valor}>{resumo.compras}</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  linha: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  bloco: {
    flex: 1,
    gap: 2,
  },
  rotulo: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
    textTransform: 'uppercase',
  },
  valorDestaque: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.heavy,
    color: colors.primary,
  },
  valorDestaqueHistorico: {
    fontSize: fontSize.title,
    fontWeight: fontWeight.heavy,
    color: colors.info,
  },
  variacao: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  faixa: {
    flexDirection: 'row',
    gap: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  faixaItem: {
    flex: 1,
    gap: 2,
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.lg,
    padding: spacing.sm,
  },
  valor: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textBody,
  },
});
