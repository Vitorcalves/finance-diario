import {StyleSheet, Text, View} from 'react-native';
import {type ItemTransacao, totalItemTransacao} from '../../../models/itensTransacao';
import type {Transacoes} from '../../../models/transacoesModel';
import {IconButton} from '../../../components/ui';
import {colors, fontSize, fontWeight, sharedStyles, spacing} from '../../../theme';
import {formatarData, toCurrency} from '../../../utils/format';
import React from "react";

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
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.info}>
          <Text style={styles.titulo}>{transacao.descricao}</Text>
          <Text style={styles.meta}>
            {formatarData(transacao.data)}
            {empresa ? ` • ${empresa}` : ''}
          </Text>
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
          <IconButton icon="trash" variant="danger" onPress={(): void => onRemover(transacao.id)}/>
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
