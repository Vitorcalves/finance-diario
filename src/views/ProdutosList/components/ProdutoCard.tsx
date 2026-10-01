import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useState } from 'react';
import { LayoutAnimation, View } from 'react-native';
import { IconButton, PressableScale, Text } from '../../../components/ui';
import type { Produto } from '../../../models/produtos';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
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

type ProdutoCardProps = {
  produto: Produto;
  /** Nomes das categorias vinculadas. */
  categorias: string[];
  variantes: ProdutoVariantes[];
  nomeUnidade: (id: number | null) => string;
  nomeMarca: (id: number | null) => string;
  /** Botao "..." com historico, edicao e exclusao. */
  onAbrirAcoes: () => void;
};

/** Cartao de um produto: tocar mostra as variantes; o "..." abre historico, edicao e exclusao. */
function ProdutoCard({
  produto,
  categorias,
  variantes,
  nomeUnidade,
  nomeMarca,
  onAbrirAcoes,
}: ProdutoCardProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [variantesAbertas, setVariantesAbertas] = useState(false);
  const eventual = produto.eventual === 1;
  const temVariantes = variantes.length > 0;

  const alternarVariantes = (): void => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setVariantesAbertas((atual) => !atual);
  };

  return (
    <PressableScale
      style={[sharedStyles.card, styles.card]}
      onPress={alternarVariantes}
      disabled={!temVariantes}
      escala={0.98}
      accessibilityRole="button"
      accessibilityLabel={`Variantes de ${produto.nome}`}
      accessibilityState={{ expanded: variantesAbertas, disabled: !temVariantes }}
    >
      <View style={styles.headerRow}>
        <View style={[styles.avatar, eventual && styles.avatarEventual]}>
          <Ionicons
            name={eventual ? 'time-outline' : 'cube-outline'}
            size={iconSize.md}
            color={eventual ? colors.textMuted : colors.primary}
          />
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.titulo} numberOfLines={2}>
            {produto.nome}
          </Text>
          <Text style={styles.preco}>
            {toCurrency(produto.preco)}
            {produto.unidade_id !== null ? ` / ${nomeUnidade(produto.unidade_id)}` : ''}
          </Text>
        </View>

        <IconButton
          icon="ellipsis-horizontal"
          variant="neutral"
          size={iconSize.sm}
          onPress={onAbrirAcoes}
          accessibilityLabel={`Mais ações de ${produto.nome}`}
        />
      </View>

      {(categorias.length > 0 || eventual) && (
        <View style={styles.categoriaRow}>
          {eventual && (
            <View style={[styles.categoriaChip, styles.chipEventual]}>
              <Text style={[styles.categoriaChipText, styles.chipEventualTexto]}>
                Compra eventual
              </Text>
            </View>
          )}
          {categorias.map((nomeCategoria) => (
            <View key={nomeCategoria} style={styles.categoriaChip}>
              <Text style={styles.categoriaChipText}>{nomeCategoria}</Text>
            </View>
          ))}
        </View>
      )}

      {temVariantes && (
        <View style={styles.variantesBloco}>
          <View style={styles.variantesToggle}>
            <Text style={styles.variantesToggleText}>
              {variantes.length} {variantes.length === 1 ? 'variante' : 'variantes'}
            </Text>
            <Ionicons
              name={variantesAbertas ? 'chevron-up' : 'chevron-down'}
              size={iconSize.sm}
              color={colors.textMuted}
            />
          </View>

          {variantesAbertas && (
            <View style={styles.variantesLista}>
              {variantes.map((variante) => (
                <View key={variante.id} style={styles.varianteLinha}>
                  <Text style={styles.varianteMarca} numberOfLines={1}>
                    {nomeMarca(variante.marca_id) || 'Sem marca'}
                    {variante.codigo_barras ? (
                      <Text style={styles.varianteCodigo}>{`  ${variante.codigo_barras}`}</Text>
                    ) : null}
                  </Text>
                  <Text style={styles.variantePreco}>{toCurrency(variante.preco)}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}
    </PressableScale>
  );
}

export default memo(ProdutoCard);

const useStyles = makeStyles((colors) => ({
  card: {
    marginBottom: spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEventual: {
    backgroundColor: colors.surfaceMuted,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  preco: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  categoriaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  categoriaChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
  },
  categoriaChipText: {
    fontSize: fontSize.micro,
    color: colors.primary,
    fontWeight: fontWeight.medium,
  },
  chipEventual: {
    backgroundColor: colors.surfaceMuted,
  },
  chipEventualTexto: {
    color: colors.textMuted,
  },
  variantesBloco: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  variantesToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  variantesToggleText: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  variantesLista: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  varianteLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceMuted,
  },
  varianteMarca: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.text,
  },
  varianteCodigo: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  variantePreco: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
}));
