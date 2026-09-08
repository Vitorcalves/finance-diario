import { Pressable, ScrollView, Text, View } from 'react-native';
import { sharedStyles } from '../../theme';

export type ChipOpcao<T extends string | number> = {
  valor: T;
  rotulo: string;
};

type ChipSelectorProps<T extends string | number> = {
  opcoes: ChipOpcao<T>[];
  selecionado: T | null;
  onSelecionar: (valor: T) => void;
  /** `true` rola na horizontal; `false` (padrao) quebra em varias linhas. */
  scroll?: boolean;
};

/**
 * Lista de chips com no maximo uma opcao ativa.
 * Usada nos filtros e na escolha de variante/agrupamento.
 */
export default function ChipSelector<T extends string | number>({
  opcoes,
  selecionado,
  onSelecionar,
  scroll = false,
}: ChipSelectorProps<T>): React.ReactNode {
  const chips = opcoes.map((opcao) => (
    <Pressable
      key={opcao.valor}
      style={[
        sharedStyles.chip,
        scroll && sharedStyles.chipSpaced,
        selecionado === opcao.valor && sharedStyles.chipActive,
      ]}
      onPress={(): void => onSelecionar(opcao.valor)}
    >
      <Text
        style={[sharedStyles.chipText, selecionado === opcao.valor && sharedStyles.chipTextActive]}
      >
        {opcao.rotulo}
      </Text>
    </Pressable>
  ));

  if (scroll) {
    return (
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={sharedStyles.chipScrollRow}
      >
        {chips}
      </ScrollView>
    );
  }

  return <View style={sharedStyles.chipRow}>{chips}</View>;
}
