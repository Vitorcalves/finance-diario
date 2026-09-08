import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  colors,
  fontSize,
  fontWeight,
  iconSize,
  radius,
  sharedStyles,
  spacing,
} from '../../../theme';
import { formatarData, toCurrency, toPercent } from '../../../utils/format';
import type { Agrupamento, GrupoPreco } from '../types';

type GrupoPrecoCardProps = {
  grupo: GrupoPreco;
  agrupamento: Agrupamento;
  expandido: boolean;
  onAlternar: () => void;
  /** Grupo com o menor preco atual entre todos. */
  melhor: boolean;
  nomeEmpresa: (id: string | null) => string;
  rotuloVariante: (varianteId: string) => string;
};

/** Cartao de um grupo de precos, com metricas e o historico expansivel. */
export default function GrupoPrecoCard({
  grupo,
  agrupamento,
  expandido,
  onAlternar,
  melhor,
  nomeEmpresa,
  rotuloVariante,
}: GrupoPrecoCardProps): React.ReactNode {
  const variacao = grupo.menor > 0 ? ((grupo.atual - grupo.menor) / grupo.menor) * 100 : 0;

  return (
    <View style={[sharedStyles.card, melhor && sharedStyles.cardHighlight]}>
      <Pressable style={styles.header} onPress={onAlternar}>
        <View style={styles.info}>
          <View style={styles.tituloRow}>
            <Text style={styles.titulo}>{grupo.titulo}</Text>
            {melhor && (
              <View style={[sharedStyles.badge, sharedStyles.badgeSuccess]}>
                <Text style={sharedStyles.badgeText}>Melhor preco</Text>
              </View>
            )}
          </View>
          <Text style={styles.subtitulo}>{grupo.subtitulo}</Text>
        </View>
        <Ionicons
          name={expandido ? 'chevron-up' : 'chevron-down'}
          size={iconSize.md}
          color={colors.primaryDark}
        />
      </Pressable>

      <View style={styles.metricasRow}>
        <View style={styles.metrica}>
          <Text style={styles.metricaLabel}>Atual</Text>
          <Text style={styles.metricaValorDestaque}>{toCurrency(grupo.atual)}</Text>
          <Text style={styles.metricaDetalhe}>{formatarData(grupo.registroAtual.data)}</Text>
        </View>
        <View style={styles.metrica}>
          <Text style={styles.metricaLabel}>Menor</Text>
          <Text style={styles.metricaValor}>{toCurrency(grupo.menor)}</Text>
          <Text style={styles.metricaDetalhe} numberOfLines={1}>
            {nomeEmpresa(grupo.registroMenor.empresa_id)}
          </Text>
        </View>
        <View style={styles.metrica}>
          <Text style={styles.metricaLabel}>Maior</Text>
          <Text style={styles.metricaValor}>{toCurrency(grupo.maior)}</Text>
          <Text style={styles.metricaDetalhe}>Media {toCurrency(grupo.media)}</Text>
        </View>
      </View>

      {grupo.registros.length > 1 && (
        <Text
          style={[
            styles.variacaoText,
            variacao > 0 ? sharedStyles.negative : sharedStyles.positive,
          ]}
        >
          {variacao > 0
            ? `${toPercent(variacao)} acima do menor preco ja pago`
            : 'Esta no menor preco ja registrado'}
        </Text>
      )}

      {expandido && (
        <View style={styles.registrosLista}>
          {grupo.registros.map((registro) => (
            <View key={registro.id} style={styles.registroRow}>
              <View style={styles.registroInfo}>
                <Text style={styles.registroData}>{formatarData(registro.data)}</Text>
                <Text style={styles.registroEmpresa} numberOfLines={1}>
                  {nomeEmpresa(registro.empresa_id)}
                  {agrupamento === 'produto' ? ` • ${rotuloVariante(registro.variante_id)}` : ''}
                </Text>
              </View>
              <Text
                style={[
                  styles.registroPreco,
                  registro.preco === grupo.menor && sharedStyles.positive,
                ]}
              >
                {toCurrency(registro.preco)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
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
  titulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  subtitulo: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  metricasRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  metrica: {
    flex: 1,
    backgroundColor: colors.surfaceMuted,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  metricaLabel: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  metricaValor: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
    marginTop: 2,
  },
  metricaValorDestaque: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.heavy,
    color: colors.primary,
    marginTop: 2,
  },
  metricaDetalhe: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
    marginTop: 2,
  },
  variacaoText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
  },
  registrosLista: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    gap: spacing.sm,
  },
  registroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  registroInfo: {
    flex: 1,
  },
  registroData: {
    fontSize: fontSize.small,
    color: colors.primaryDark,
    fontWeight: fontWeight.medium,
  },
  registroEmpresa: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  registroPreco: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
});
