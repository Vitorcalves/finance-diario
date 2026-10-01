import { View } from 'react-native';
import { IconButton, Text } from '../../../components/ui';
import { iconSize, useTheme } from '../../../theme';
import { toCurrency } from '../../../utils/format';
import { Unidades } from '../../../utils/unidades';
import type { VarianteFormItem } from '../types';

type VarianteCardProps = {
  variante: VarianteFormItem;
  nomeMarca: (id: number | null) => string;
  onEditar: () => void;
  onRemover: () => void;
};

/** Variante ja adicionada ao produto, com acoes de editar e remover. */
export default function VarianteCard({
  variante,
  nomeMarca,
  onEditar,
  onRemover,
}: VarianteCardProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  return (
    <View style={sharedStyles.listCard}>
      <View style={sharedStyles.listCardInfo}>
        <Text style={sharedStyles.listCardTitle}>{nomeMarca(variante.marcaId) || 'Sem marca'}</Text>
        <Text style={sharedStyles.listCardDetail}>
          {toCurrency(Number(variante.preco) || 0)}
          {variante.unidadeId !== null ? ` • ${Unidades.descricaoPorId(variante.unidadeId)}` : ''}
          {variante.quantidade ? ` • Qtd: ${variante.quantidade}` : ''}
        </Text>
        {variante.codigoBarras ? (
          <Text style={sharedStyles.listCardDetail}>Código: {variante.codigoBarras}</Text>
        ) : null}
      </View>

      <View style={sharedStyles.iconButtonRow}>
        <IconButton icon="pencil" variant="primary" size={iconSize.sm} onPress={onEditar} />
        <IconButton icon="trash" variant="danger" size={iconSize.sm} onPress={onRemover} />
      </View>
    </View>
  );
}
