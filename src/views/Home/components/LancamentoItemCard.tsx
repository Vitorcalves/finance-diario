import { View } from 'react-native';
import { IconButton, Text } from '../../../components/ui';
import { iconSize, useTheme } from '../../../theme';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { formatarQuantidade, toCurrency } from '../../../utils/format';
import { quantidadeFracionada } from '../../../utils/rascunhoDaNotaFiscal';
import { ehGranel, rotuloQuantidade } from '../../../utils/variantes';
import type { ItemLancamento } from '../types';
import React from 'react';

/** `0,196 kg` no item da nota pesado sem variante a granel; senao, o rotulo de sempre. */
const rotuloDoItem = (item: ItemLancamento, variante: ProdutoVariantes | undefined): string => {
  const unidade = item.itemNota?.unidade ?? '';

  if (!ehGranel(variante) && unidade && quantidadeFracionada(unidade, item.quantidade)) {
    return `${formatarQuantidade(item.quantidade)} ${unidade.toLowerCase()}`;
  }

  return rotuloQuantidade(item.quantidade, variante);
};

type LancamentoItemCardProps = {
  item: ItemLancamento;
  /** Variante do item, para mostrar o peso com a medida (`0,75 kg`) quando e a granel. */
  variante: ProdutoVariantes | undefined;
  onEditar: () => void;
  onRemover: () => void;
};

/** Item ja adicionado ao lancamento, com acoes de editar e remover. */
export default function LancamentoItemCard({
  item,
  variante,
  onEditar,
  onRemover,
}: LancamentoItemCardProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  return (
    <View style={sharedStyles.listCard}>
      <View style={sharedStyles.listCardInfo}>
        <Text style={sharedStyles.listCardTitle}>{item.descricao}</Text>
        <Text style={sharedStyles.listCardDetail}>
          {`${rotuloDoItem(item, variante)} x ${toCurrency(
            item.precoUnitario,
          )} = ${toCurrency(item.quantidade * item.precoUnitario)}`}
        </Text>
        {item.varianteId === null && item.produtoId !== null && (
          <Text style={sharedStyles.listCardDetail}>Sem variante selecionada</Text>
        )}
        {item.itemNota && item.produtoId === null && (
          <Text style={sharedStyles.listCardDetail}>Da nota, sem produto ligado</Text>
        )}
      </View>

      <View style={sharedStyles.iconButtonRow}>
        <IconButton icon="pencil" variant="primary" size={iconSize.sm} onPress={onEditar} />
        <IconButton icon="trash" variant="danger" size={iconSize.sm} onPress={onRemover} />
      </View>
    </View>
  );
}
