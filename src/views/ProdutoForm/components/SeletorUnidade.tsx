import { Pressable, ScrollView } from 'react-native';
import { useTheme } from '../../../theme';
import { Unidades } from '../../../utils/unidades';
import { Text } from '../../../components/ui';

type SeletorUnidadeProps = {
  valor: number | null;
  onSelecionar: (id: number | null) => void;
  /** `true` lista apenas as unidades primarias (kg, L, un...). */
  apenasPrimarias?: boolean;
};

/**
 * Chips de unidade com a opcao "Nenhuma".
 * Nao usa `ChipSelector` porque precisa representar o valor nulo.
 */
export default function SeletorUnidade({
  valor,
  onSelecionar,
  apenasPrimarias = false,
}: SeletorUnidadeProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const unidades = apenasPrimarias
    ? Unidades.listar().filter((unidade) => unidade.primario)
    : Unidades.listar();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={sharedStyles.chipScrollRow}
    >
      <Pressable
        style={[
          sharedStyles.chip,
          sharedStyles.chipSpaced,
          valor === null && sharedStyles.chipActive,
        ]}
        onPress={(): void => onSelecionar(null)}
      >
        <Text style={[sharedStyles.chipText, valor === null && sharedStyles.chipTextActive]}>
          Nenhuma
        </Text>
      </Pressable>

      {unidades.map((unidade) => (
        <Pressable
          key={unidade.id}
          style={[
            sharedStyles.chip,
            sharedStyles.chipSpaced,
            valor === unidade.id && sharedStyles.chipActive,
          ]}
          onPress={(): void => onSelecionar(unidade.id)}
        >
          <Text
            style={[sharedStyles.chipText, valor === unidade.id && sharedStyles.chipTextActive]}
          >
            {unidade.descricao}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
