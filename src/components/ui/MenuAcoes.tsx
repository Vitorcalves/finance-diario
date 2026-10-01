import Ionicons from '@expo/vector-icons/Ionicons';
import { type ComponentProps, useRef } from 'react';
import { View } from 'react-native';
import { fontSize, fontWeight, iconSize, makeStyles, radius, spacing, useTheme } from '../../theme';
import BottomSheet from './BottomSheet';
import PressableScale from './PressableScale';
import Text from './Text';

export type AcaoMenu = {
  rotulo: string;
  icone: ComponentProps<typeof Ionicons>['name'];
  onPress: () => void;
  /** Destaca a acao como destrutiva. */
  perigo?: boolean;
};

type MenuAcoesProps = {
  visivel: boolean;
  titulo: string;
  subtitulo?: string;
  acoes: AcaoMenu[];
  onFechar: () => void;
};

/** Lista de acoes em painel inferior, aberta pelo botao "..." de um cartao. */
export default function MenuAcoes({
  visivel,
  titulo,
  subtitulo,
  acoes,
  onFechar,
}: MenuAcoesProps): React.ReactNode {
  const { colors } = useTheme();
  const styles = useStyles();
  /** A acao roda so depois do painel sumir: um alerta aberto durante a saida se perde no iOS. */
  const pendente = useRef<(() => void) | null>(null);

  return (
    <BottomSheet
      visivel={visivel}
      onFechar={onFechar}
      aoTerminarDeFechar={(): void => {
        const acao = pendente.current;
        pendente.current = null;
        acao?.();
      }}
      titulo={titulo}
      subtitulo={subtitulo}
      rolavel={false}
    >
      <View style={styles.lista}>
        {acoes.map((acao) => (
          <PressableScale
            key={acao.rotulo}
            style={styles.item}
            escala={0.98}
            vibrar
            accessibilityRole="button"
            onPress={(): void => {
              pendente.current = acao.onPress;
              onFechar();
            }}
          >
            <View style={[styles.icone, acao.perigo && styles.iconePerigo]}>
              <Ionicons
                name={acao.icone}
                size={iconSize.md}
                color={acao.perigo ? colors.danger : colors.primary}
              />
            </View>
            <Text style={[styles.rotulo, acao.perigo && styles.rotuloPerigo]}>{acao.rotulo}</Text>
          </PressableScale>
        ))}
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
  icone: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconePerigo: {
    backgroundColor: colors.dangerSoft,
  },
  rotulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  rotuloPerigo: {
    color: colors.danger,
  },
}));
