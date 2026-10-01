import { View } from 'react-native';
import { IconButton, Text } from '../../../components/ui';
import type { Empresa } from '../../../models/empresas';
import { useTheme } from '../../../theme';

type EmpresaCardProps = {
  empresa: Empresa;
  onEditar: () => void;
  onDeletar: () => void;
};

/** Linha da lista de empresas. */
export default function EmpresaCard({
  empresa,
  onEditar,
  onDeletar,
}: EmpresaCardProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  return (
    <View style={sharedStyles.listCard}>
      <View style={sharedStyles.listCardInfo}>
        <Text style={sharedStyles.listCardTitle}>{empresa.nome}</Text>
        {empresa.cnpj ? (
          <Text style={sharedStyles.listCardDetail}>CNPJ: {empresa.cnpj}</Text>
        ) : null}
        {empresa.observacao ? (
          <Text style={sharedStyles.listCardDetail}>Obs: {empresa.observacao}</Text>
        ) : null}
      </View>

      <View style={sharedStyles.iconButtonRow}>
        <IconButton icon="pencil" variant="primary" onPress={onEditar} />
        <IconButton icon="trash" variant="danger" onPress={onDeletar} />
      </View>
    </View>
  );
}
