import {Text, View} from 'react-native';
import {IconButton} from '../../../components/ui';
import {iconSize, sharedStyles} from '../../../theme';
import {toCurrency} from '../../../utils/format';
import type {ItemLancamento} from '../types';
import React from "react";

type LancamentoItemCardProps = {
  item: ItemLancamento;
  onEditar: () => void;
  onRemover: () => void;
};

/** Item ja adicionado ao lancamento, com acoes de editar e remover. */
export default function LancamentoItemCard({
                                             item,
                                             onEditar,
                                             onRemover,
                                           }: LancamentoItemCardProps): React.ReactNode {
  return (
    <View style={sharedStyles.listCard}>
      <View style={sharedStyles.listCardInfo}>
        <Text style={sharedStyles.listCardTitle}>{item.descricao}</Text>
        <Text style={sharedStyles.listCardDetail}>
          {`${item.quantidade} x ${toCurrency(item.precoUnitario)} = ${toCurrency(
            item.quantidade * item.precoUnitario,
          )}`}
        </Text>
        {item.varianteId === null && item.produtoId !== null && (
          <Text style={sharedStyles.listCardDetail}>Sem variante selecionada</Text>
        )}
      </View>

      <View style={sharedStyles.iconButtonRow}>
        <IconButton icon="pencil" variant="primary" size={iconSize.sm} onPress={onEditar}/>
        <IconButton icon="trash" variant="danger" size={iconSize.sm} onPress={onRemover}/>
      </View>
    </View>
  );
}
