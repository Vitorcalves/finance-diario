import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from '../../../components/ui';
import { colors, fontSize, fontWeight, iconSize, sharedStyles } from '../../../theme';
import { toCurrency, toCurrencyPorUnidade } from '../../../utils/format';
import type { PrecoPorUnidade } from '../../../utils/variantes';
import type { ItemOrcamento } from '../types';

type ItemOrcamentoCardProps = {
  item: ItemOrcamento;
  /** Preco reduzido a unidade primaria; `null` quando a variante nao tem medida cadastrada. */
  unitario: PrecoPorUnidade | null;
  rotuloQuantidade: (quantidade: number, varianteId: string) => string;
  onEditar: () => void;
  onRemover: () => void;
};

/** Item ja adicionado ao orcamento. */
export default function ItemOrcamentoCard({
  item,
  unitario,
  rotuloQuantidade,
  onEditar,
  onRemover,
}: ItemOrcamentoCardProps): React.ReactNode {
  return (
    <View style={sharedStyles.listCard}>
      <View style={sharedStyles.listCardInfo}>
        <Text style={sharedStyles.listCardTitle}>{item.descricao}</Text>
        <Text style={sharedStyles.listCardDetail}>
          {`${rotuloQuantidade(item.quantidade, item.varianteId)} x ${toCurrency(
            item.preco,
          )} = ${toCurrency(item.quantidade * item.preco)}`}
        </Text>
        {unitario && (
          <Text style={styles.unitario}>
            {toCurrencyPorUnidade(unitario.valor, unitario.sigla)}
          </Text>
        )}
      </View>

      <View style={sharedStyles.iconButtonRow}>
        <IconButton icon="pencil" variant="primary" size={iconSize.sm} onPress={onEditar} />
        <IconButton icon="trash" variant="danger" size={iconSize.sm} onPress={onRemover} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  unitario: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
});
