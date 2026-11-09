import Ionicons from '@expo/vector-icons/Ionicons';
import dayjs from 'dayjs';
import { View } from 'react-native';
import { IconButton, PressableScale, Text } from '../../../components/ui';
import type { ResumoTag } from '../../../models/tags';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  shadows,
  spacing,
  useTheme,
} from '../../../theme';
import { toCurrency } from '../../../utils/format';
import { rotuloIntervalo } from '../../../utils/periodos';

type TagCardProps = {
  tag: ResumoTag;
  /** Abre a busca com os lancamentos da tag. */
  onAbrir: () => void;
  onEditar: () => void;
  onExcluir: () => void;
};

/** Ex.: "05/07/26" num dia so; "03/07/26 a 18/07/26" num periodo. */
const periodoDoEvento = (inicio: string, fim: string): string =>
  inicio === fim ? dayjs(inicio).format('DD/MM/YY') : rotuloIntervalo({ inicio, fim });

/**
 * Cartao de uma tag: quanto o evento custou (todas as categorias somadas),
 * quantos lancamentos, quando foi e o que ainda vai vencer.
 */
export default function TagCard({
  tag,
  onAbrir,
  onEditar,
  onExcluir,
}: TagCardProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const vazia = tag.quantidade === 0;

  const detalhes = [
    `${tag.quantidade} ${tag.quantidade === 1 ? 'lançamento' : 'lançamentos'}`,
    tag.inicio && tag.fim ? periodoDoEvento(tag.inicio, tag.fim) : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <PressableScale
      style={styles.cartao}
      escala={0.98}
      onPress={onAbrir}
      disabled={vazia}
      accessibilityRole="button"
      accessibilityLabel={
        vazia
          ? `${tag.nome}, sem lançamentos`
          : `${tag.nome}: gasto de ${toCurrency(tag.gastos)}. Ver lançamentos`
      }
    >
      <View style={styles.topo}>
        <View style={styles.icone}>
          <Ionicons name="bookmark" size={iconSize.sm} color={colors.primary} />
        </View>
        <View style={styles.textos}>
          <Text style={styles.nome} numberOfLines={1}>
            {tag.nome}
          </Text>
          {tag.descricao ? (
            <Text style={styles.descricao} numberOfLines={2}>
              {tag.descricao}
            </Text>
          ) : null}
        </View>
        <IconButton
          icon="pencil"
          variant="neutral"
          size={iconSize.sm}
          onPress={onEditar}
          accessibilityLabel={`Editar ${tag.nome}`}
        />
        <IconButton
          icon="trash-outline"
          variant="danger"
          size={iconSize.sm}
          onPress={onExcluir}
          accessibilityLabel={`Excluir ${tag.nome}`}
        />
      </View>

      {vazia ? (
        <Text style={styles.dica}>
          Nenhum lançamento ainda. Marque a tag no formulário do lançamento ou arraste um lançamento
          da lista para o lado.
        </Text>
      ) : (
        <>
          <View style={styles.valores}>
            <View style={styles.valorBloco}>
              <Text style={styles.rotulo}>Gasto</Text>
              <Text style={[styles.gasto, sharedStyles.negative]}>{toCurrency(tag.gastos)}</Text>
            </View>
            {tag.entradas > 0 && (
              <View style={[styles.valorBloco, styles.valorDireita]}>
                <Text style={styles.rotulo}>Entradas</Text>
                <Text style={[styles.entrada, sharedStyles.positive]}>
                  {`+${toCurrency(tag.entradas)}`}
                </Text>
              </View>
            )}
          </View>

          {tag.aVencer > 0 && (
            <Text style={styles.aVencer}>
              {`${toCurrency(tag.aVencer)} em parcelas ainda a vencer`}
            </Text>
          )}

          <View style={styles.rodape}>
            <Text style={styles.detalhes} numberOfLines={1}>
              {detalhes}
            </Text>
            <View style={styles.verTodos}>
              <Text style={styles.verTodosTexto}>Ver lançamentos</Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </View>
          </View>
        </>
      )}
    </PressableScale>
  );
}

const useStyles = makeStyles((colors) => ({
  cartao: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    gap: spacing.md,
    ...shadows.card,
  },
  topo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icone: {
    width: 40,
    height: 40,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  nome: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  descricao: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  dica: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  valores: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  valorBloco: {
    gap: 2,
  },
  valorDireita: {
    alignItems: 'flex-end',
  },
  rotulo: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  gasto: {
    fontSize: 26,
    fontWeight: fontWeight.heavy,
    letterSpacing: -0.5,
  },
  entrada: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
  },
  aVencer: {
    fontSize: fontSize.caption,
    color: colors.info,
  },
  rodape: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  detalhes: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  verTodos: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  verTodosTexto: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
}));
