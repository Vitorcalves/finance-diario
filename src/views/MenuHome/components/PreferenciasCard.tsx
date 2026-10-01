import { View } from 'react-native';
import { ChipSelector, SegmentedControl, Text } from '../../../components/ui';
import {
  fontSize,
  fontWeight,
  makeStyles,
  type PreferenciaTema,
  radius,
  shadows,
  spacing,
  useTheme,
} from '../../../theme';
import { Locais } from '../../../utils/local';

type PreferenciasCardProps = {
  localPadrao: number;
  onAlterarLocalPadrao: (id: number) => void;
};

/**
 * Preferencias do app, configuradas uma vez em vez de perguntadas em cada
 * formulario: aparencia (claro/escuro) e local padrao de compra.
 */
export default function PreferenciasCard({
  localPadrao,
  onAlterarLocalPadrao,
}: PreferenciasCardProps): React.ReactNode {
  const { preferencia, setPreferencia } = useTheme();
  const styles = useStyles();

  return (
    <View style={styles.secao}>
      <Text style={styles.tituloSecao}>Preferências</Text>

      <View style={styles.cartao}>
        <View style={styles.bloco}>
          <Text style={styles.titulo}>Aparência</Text>
          <SegmentedControl<PreferenciaTema>
            opcoes={[
              { valor: 'sistema', rotulo: 'Sistema' },
              { valor: 'claro', rotulo: 'Claro' },
              { valor: 'escuro', rotulo: 'Escuro' },
            ]}
            valor={preferencia}
            onChange={setPreferencia}
          />
        </View>

        <View style={styles.divisor} />

        <View style={styles.bloco}>
          <Text style={styles.titulo}>Local padrão de compra</Text>
          <Text style={styles.hint}>
            Usado automaticamente ao registrar lançamentos e preços, sem perguntar toda vez.
          </Text>
          <ChipSelector
            opcoes={Locais.listar().map((item) => ({ valor: item.id, rotulo: item.descricao }))}
            selecionado={localPadrao}
            onSelecionar={onAlterarLocalPadrao}
          />
        </View>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  secao: {
    gap: spacing.sm,
  },
  tituloSecao: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    paddingHorizontal: spacing.xs,
  },
  cartao: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  bloco: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  divisor: {
    height: 1,
    marginHorizontal: spacing.lg,
    backgroundColor: colors.divider,
  },
  titulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  hint: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
}));
