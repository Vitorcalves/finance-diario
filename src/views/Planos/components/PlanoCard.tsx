import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { IconButton } from '../../../components/ui';
import {
  colors,
  fontSize,
  fontWeight,
  iconSize,
  radius,
  sharedStyles,
  spacing,
} from '../../../theme';
import { formatarData, toCurrency } from '../../../utils/format';
import { ROTULO_FREQUENCIA } from '../../../utils/parcelas';
import type { PlanoNaTela } from '../types';

type PlanoCardProps = {
  item: PlanoNaTela;
  onEncerrar: () => void;
  onExcluir: () => void;
};

/** Cartao de uma assinatura ou de um parcelamento em andamento. */
export default function PlanoCard({
  item,
  onEncerrar,
  onExcluir,
}: PlanoCardProps): React.ReactNode {
  const { plano } = item;
  const assinatura = plano.tipo === 'assinatura';
  const ativo = item.emAndamento;

  const ritmo = assinatura
    ? ROTULO_FREQUENCIA[plano.frequencia]
    : `${plano.total_parcelas}x de ${toCurrency(item.valorParcela)}`;

  return (
    <View style={[sharedStyles.card, !ativo && styles.cardEncerrado]}>
      <View style={styles.header}>
        <View style={styles.info}>
          <View style={styles.tituloRow}>
            <Ionicons
              name={assinatura ? 'repeat' : 'card-outline'}
              size={iconSize.sm}
              color={colors.primary}
            />
            <Text style={sharedStyles.listCardTitle}>{plano.descricao}</Text>
          </View>

          <Text style={styles.meta}>
            {ritmo}
            {item.empresa ? ` • ${item.empresa}` : ''}
          </Text>
        </View>

        <View style={sharedStyles.iconButtonRow}>
          {ativo && <IconButton icon="stop-circle" variant="info" onPress={onEncerrar} />}
          <IconButton icon="trash" variant="danger" onPress={onExcluir} />
        </View>
      </View>

      <View style={styles.linhas}>
        <View style={styles.linha}>
          <Text style={styles.rotulo}>{assinatura ? 'Por cobranca' : 'Valor da parcela'}</Text>
          <Text style={styles.valor}>{toCurrency(item.valorParcela)}</Text>
        </View>

        {assinatura && plano.frequencia !== 'mensal' && (
          <View style={styles.linha}>
            <Text style={styles.rotulo}>Equivale por mes</Text>
            <Text style={styles.valor}>{toCurrency(item.custoMensal)}</Text>
          </View>
        )}

        {!assinatura && plano.valor_total !== null && plano.valor_total !== undefined && (
          <View style={styles.linha}>
            <Text style={styles.rotulo}>Total da compra</Text>
            <Text style={styles.valor}>{toCurrency(Math.abs(plano.valor_total))}</Text>
          </View>
        )}

        <View style={styles.linha}>
          <Text style={styles.rotulo}>Ja pago</Text>
          <Text style={styles.valor}>
            {plano.total_parcelas
              ? `${item.cobrancasPagas}/${plano.total_parcelas} • ${toCurrency(item.totalPago)}`
              : `${item.cobrancasPagas} cobranca(s) • ${toCurrency(item.totalPago)}`}
          </Text>
        </View>

        <View style={styles.linha}>
          <Text style={styles.rotulo}>
            {ativo ? 'Proxima cobranca' : item.concluido ? 'Quitado' : 'Encerrado em'}
          </Text>
          <Text style={[styles.valor, ativo && styles.valorDestaque]}>
            {ativo && item.proximaCobranca
              ? formatarData(item.proximaCobranca)
              : plano.data_fim
                ? formatarData(plano.data_fim)
                : '-'}
          </Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  cardEncerrado: {
    backgroundColor: colors.surfaceAlt,
    borderStyle: 'dashed',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  tituloRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  meta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  linhas: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rotulo: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  valor: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    color: colors.textBody,
  },
  valorDestaque: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
    borderRadius: radius.sm,
  },
});
