import { StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import dayjs from 'dayjs';
import { type ItemTransacao, totalItemTransacao } from '../../../models/itensTransacao';
import type { Transacoes } from '../../../models/transacoesModel';
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
import React from 'react';

type TransacaoItemProps = {
  transacao: Transacoes;
  itens: ItemTransacao[];
  empresa: string;
  onRemover: (id: string) => void;
};

/** Uma linha da lista de lancamentos, com os itens da compra abaixo. */
export default function TransacaoItem({
  transacao,
  itens,
  empresa,
  onRemover,
}: TransacaoItemProps): React.ReactNode {
  /** Parcela ou assinatura que ainda vai vencer: ja lancada, mas fora do caixa de hoje. */
  const previsto = transacao.data > dayjs().format('YYYY-MM-DD');

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.titulo}>{transacao.descricao}</Text>
          <Text style={styles.meta}>
            {formatarData(transacao.data)}
            {empresa ? ` • ${empresa}` : ''}
          </Text>

          {previsto && (
            <View style={styles.selo}>
              <Ionicons name="time-outline" size={iconSize.sm} color={colors.info} />
              <Text style={styles.seloTexto}>A vencer</Text>
            </View>
          )}
        </View>

        <View style={styles.acoes}>
          <Text
            style={[
              styles.valor,
              transacao.valor < 0 ? sharedStyles.negative : sharedStyles.positive,
            ]}
          >
            {toCurrency(transacao.valor)}
          </Text>
          <IconButton icon="trash" variant="danger" onPress={(): void => onRemover(transacao.id)} />
        </View>
      </View>

      {itens.length > 0 && (
        <View style={styles.itensLista}>
          {itens.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemDescricao} numberOfLines={1}>
                {`${item.quantidade}x ${item.descricao}`}
              </Text>
              <Text style={styles.itemValor}>{toCurrency(totalItemTransacao(item))}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  acoes: {
    alignItems: 'flex-end',
    gap: spacing.xs,
  },
  titulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textBody,
  },
  meta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  selo: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 2,
    marginTop: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.infoSoft,
    borderWidth: 1,
    borderColor: colors.infoBorder,
  },
  seloTexto: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    color: colors.info,
  },
  valor: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  itensLista: {
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
    paddingLeft: spacing.md,
    gap: 2,
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  itemDescricao: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  itemValor: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primaryDark,
  },
});
