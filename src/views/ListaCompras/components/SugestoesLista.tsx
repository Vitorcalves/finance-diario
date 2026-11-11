import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, View } from 'react-native';
import { Button, PressableScale, Text } from '../../../components/ui';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../../../theme';
import type { SugestaoNaLista } from '../useListaCompras';

type SugestoesListaProps = {
  sugestoes: SugestaoNaLista[];
  onAdicionar: (sugestoes: SugestaoNaLista[]) => void;
};

/** Texto curto do ritmo: quanto a ultima compra deve durar e ha quanto tempo foi ("dura ~15 dias · há 18 dias"). */
const ritmo = (sugestao: SugestaoNaLista): string => {
  const cada = sugestao.duracaoDias <= 1 ? 'dura 1 dia' : `dura ~${sugestao.duracaoDias} dias`;
  const ultima =
    sugestao.diasDesdeUltima === 0
      ? 'hoje'
      : sugestao.diasDesdeUltima === 1
        ? 'ontem'
        : `há ${sugestao.diasDesdeUltima} dias`;

  return `${cada} · ${ultima}`;
};

/**
 * Produtos frequentes que ainda nao estao na lista. Aqueles em que a ultima
 * compra ja deve ter acabado vem primeiro e destacados.
 */
export default function SugestoesLista({
  sugestoes,
  onAdicionar,
}: SugestoesListaProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();

  if (sugestoes.length === 0) {
    return null;
  }

  const naHora = sugestoes.filter((sugestao) => sugestao.naHora);

  return (
    <View style={styles.container}>
      <View style={styles.cabecalho}>
        <View style={styles.titulos}>
          <Text style={sharedStyles.sectionTitle}>Costuma comprar</Text>
          <Text style={sharedStyles.sectionHint}>Pelo histórico dos seus lançamentos</Text>
        </View>
        {naHora.length > 1 && (
          <Button
            label={`Adicionar ${naHora.length}`}
            icon="add"
            size="sm"
            variant="ghost"
            onPress={(): void => onAdicionar(naHora)}
          />
        )}
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.faixa}
      >
        {sugestoes.map((sugestao) => (
          <PressableScale
            key={sugestao.produtoId}
            escala={0.95}
            style={[styles.chip, sugestao.naHora && styles.chipNaHora]}
            onPress={(): void => onAdicionar([sugestao])}
            accessibilityRole="button"
            accessibilityLabel={`Adicionar ${sugestao.nome}, ${ritmo(sugestao)}`}
          >
            <View style={styles.chipTextos}>
              <Text style={styles.chipNome} numberOfLines={1}>
                {sugestao.nome}
              </Text>
              <Text style={[styles.chipRitmo, sugestao.naHora && styles.chipRitmoNaHora]}>
                {ritmo(sugestao)}
              </Text>
            </View>
            <Ionicons
              name="add-circle"
              size={22}
              color={sugestao.naHora ? colors.primary : colors.textSubtle}
            />
          </PressableScale>
        ))}
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    gap: spacing.sm,
  },
  cabecalho: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  titulos: {
    flex: 1,
  },
  faixa: {
    gap: spacing.sm,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    maxWidth: 220,
    paddingVertical: spacing.sm,
    paddingLeft: spacing.md,
    paddingRight: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipNaHora: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
  chipTextos: {
    flexShrink: 1,
    gap: 2,
  },
  chipNome: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  chipRitmo: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  chipRitmoNaHora: {
    color: colors.primaryStrong,
    fontWeight: fontWeight.medium,
  },
}));
