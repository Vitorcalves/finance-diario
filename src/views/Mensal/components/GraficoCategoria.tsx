import Ionicons from '@expo/vector-icons/Ionicons';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useNavigation } from '@react-navigation/native';
import type dayjs from 'dayjs';
import { View } from 'react-native';
import CategoriaIcone from '../../../components/CategoriaIcone';
import { PressableScale, Text } from '../../../components/ui';
import { SEM_CATEGORIA } from '../../../models/transacoesModel';
import type { RootTabParamList } from '../../../routes/types';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import { toCurrency } from '../../../utils/format';
import type { GastoPorCategoria } from '../types';

type GraficoCategoriaProps = {
  gastoPorCategoria: GastoPorCategoria[];
  mes: dayjs.Dayjs;
};

/**
 * Gasto realizado do mes por categoria: uma barra de composicao no topo e a
 * lista com valor e fatia de cada uma. Tocar numa linha abre os lancamentos dela.
 */
export default function GraficoCategoria({
  gastoPorCategoria,
  mes,
}: GraficoCategoriaProps): React.ReactNode {
  const { colors, sharedStyles, corCategoria } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<BottomTabNavigationProp<RootTabParamList>>();

  if (gastoPorCategoria.length === 0) {
    return null;
  }

  const total = gastoPorCategoria.reduce((soma, item) => soma + item.gasto, 0);
  const temSemCategoria = gastoPorCategoria.some((item) => item.categoriaId === null);

  const abrirLancamentos = (item: GastoPorCategoria): void => {
    navigation.navigate('Home', {
      screen: 'BuscaLancamentos',
      params: {
        categoriaId: item.categoriaId ?? SEM_CATEGORIA,
        inicio: mes.startOf('month').format('YYYY-MM-DD'),
        fim: mes.endOf('month').format('YYYY-MM-DD'),
      },
    });
  };

  return (
    <View style={sharedStyles.card}>
      <Text style={sharedStyles.sectionTitle}>Por categoria</Text>

      {/* Composicao do mes: cada fatia na cor da propria categoria. */}
      <View style={styles.composicao}>
        {gastoPorCategoria.map((item) => {
          const flex = total > 0 ? item.gasto / total : 0;

          return (
            <View
              key={item.categoriaId ?? SEM_CATEGORIA}
              style={[styles.fatia, { flex, backgroundColor: corCategoria(item.cor) }]}
            />
          );
        })}
      </View>

      <View>
        {gastoPorCategoria.map((item, indice) => {
          const percentual = total > 0 ? Math.round((item.gasto / total) * 100) : 0;

          return (
            <View key={item.categoriaId ?? SEM_CATEGORIA}>
              {indice > 0 && <View style={styles.divisor} />}
              <PressableScale
                style={styles.linha}
                escala={0.98}
                onPress={(): void => abrirLancamentos(item)}
                accessibilityRole="button"
                accessibilityLabel={`${item.nome}: ${toCurrency(item.gasto)}, ${percentual}% do gasto. Ver lançamentos`}
              >
                <CategoriaIcone icone={item.icone} cor={item.cor} tamanho={36} />
                <View style={styles.textos}>
                  <Text style={styles.nome} numberOfLines={1}>
                    {item.nome}
                  </Text>
                  <Text style={styles.detalhe}>
                    {`${item.lancamentos} ${item.lancamentos === 1 ? 'lançamento' : 'lançamentos'}`}
                  </Text>
                </View>
                <View style={styles.valores}>
                  <Text style={styles.valor}>{toCurrency(item.gasto)}</Text>
                  <Text style={styles.detalhe}>{`${percentual}%`}</Text>
                </View>
                <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.textSubtle} />
              </PressableScale>
            </View>
          );
        })}
      </View>

      {temSemCategoria && (
        <View style={styles.dica}>
          <Ionicons name="information-circle-outline" size={iconSize.sm} color={colors.textMuted} />
          <Text style={styles.dicaTexto}>
            Para classificar um lançamento, deslize-o para a esquerda na lista e toque em Categoria.
          </Text>
        </View>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  composicao: {
    flexDirection: 'row',
    height: 12,
    // Fresta de 2px entre as fatias, na cor do cartao.
    gap: 2,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  fatia: {
    minWidth: 3,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  textos: {
    flex: 1,
    gap: 2,
  },
  nome: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  detalhe: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  valores: {
    alignItems: 'flex-end',
    gap: 2,
  },
  valor: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  divisor: {
    height: 1,
    marginLeft: 36 + spacing.md,
    backgroundColor: colors.divider,
  },
  dica: {
    flexDirection: 'row',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  dicaTexto: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
}));
