import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { fontSize, fontWeight, iconSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import { vibrarSelecao } from '../../utils/haptics';
import BottomSheet from './BottomSheet';
import PressableScale from './PressableScale';
import Text from './Text';

export type OpcaoSheet<T extends string> = {
  valor: T;
  rotulo: string;
  descricao?: string;
  /** Elemento a esquerda do rotulo (icone de categoria, avatar...). */
  icone?: React.ReactNode;
};

type OpcoesSheetProps<T extends string> = {
  visivel: boolean;
  titulo: string;
  opcoes: OpcaoSheet<T>[];
  selecionado: T | null;
  onSelecionar: (valor: T) => void;
  onFechar: () => void;
};

/** Lista de escolha unica em painel inferior; tocar numa opcao escolhe e fecha. */
export default function OpcoesSheet<T extends string>({
  visivel,
  titulo,
  opcoes,
  selecionado,
  onSelecionar,
  onFechar,
}: OpcoesSheetProps<T>): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();

  return (
    <BottomSheet visivel={visivel} onFechar={onFechar} titulo={titulo}>
      <View style={styles.lista}>
        {opcoes.map((opcao) => {
          const ativa = opcao.valor === selecionado;

          return (
            <PressableScale
              key={opcao.valor}
              style={[styles.item, ativa && styles.itemAtivo]}
              escala={0.98}
              accessibilityRole="button"
              accessibilityState={{ selected: ativa }}
              onPress={(): void => {
                vibrarSelecao();
                onSelecionar(opcao.valor);
                onFechar();
              }}
            >
              {opcao.icone}
              <View style={styles.textos}>
                <Text style={[styles.rotulo, ativa && styles.rotuloAtivo]}>{opcao.rotulo}</Text>
                {opcao.descricao ? <Text style={styles.descricao}>{opcao.descricao}</Text> : null}
              </View>
              {ativa && <Ionicons name="checkmark" size={iconSize.md} color={colors.primary} />}
            </PressableScale>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  lista: {
    gap: spacing.xs,
    paddingBottom: spacing.sm,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
  },
  itemAtivo: {
    backgroundColor: colors.primarySoft,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  rotulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  rotuloAtivo: {
    fontWeight: fontWeight.bold,
  },
  descricao: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
}));
