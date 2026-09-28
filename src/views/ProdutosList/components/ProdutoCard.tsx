import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { IconButton } from '../../../components/ui';
import type { Produto } from '../../../models/produtos';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { colors, fontSize, fontWeight, iconSize, sharedStyles, spacing } from '../../../theme';
import { toCurrency } from '../../../utils/format';

type ProdutoCardProps = {
  produto: Produto;
  /** Nomes das categorias vinculadas. */
  categorias: string[];
  variantes: ProdutoVariantes[];
  nomeUnidade: (id: number | null) => string;
  nomeMarca: (id: number | null) => string;
  onVerHistorico: () => void;
  onEditar: () => void;
  onDeletar: () => void;
};

/** Cartao de um produto com suas categorias e variantes. */
export default function ProdutoCard({
  produto,
  categorias,
  variantes,
  nomeUnidade,
  nomeMarca,
  onVerHistorico,
  onEditar,
  onDeletar,
}: ProdutoCardProps): React.ReactNode {
  const [variantesAbertas, setVariantesAbertas] = useState(false);

  return (
    <View style={sharedStyles.card}>
      <View style={styles.headerRow}>
        <View style={styles.headerInfo}>
          <Text style={styles.titulo} numberOfLines={2}>
            {produto.nome}
          </Text>
          <Text style={styles.preco}>
            {toCurrency(produto.preco)}
            {produto.unidade_id !== null ? ` / ${nomeUnidade(produto.unidade_id)}` : ''}
          </Text>
          {produto.eventual === 1 && <Text style={styles.eventual}>Compra eventual</Text>}
        </View>

        <View style={sharedStyles.iconButtonRow}>
          <IconButton icon="eye" variant="info" onPress={onVerHistorico} />
          <IconButton icon="pencil" variant="primary" onPress={onEditar} />
          <IconButton icon="trash" variant="danger" onPress={onDeletar} />
        </View>
      </View>

      {categorias.length > 0 && (
        <View style={styles.categoriaRow}>
          {categorias.map((nomeCategoria) => (
            <View key={nomeCategoria} style={styles.categoriaChip}>
              <Text style={styles.categoriaChipText}>{nomeCategoria}</Text>
            </View>
          ))}
        </View>
      )}

      {variantes.length === 0 ? (
        <Text style={sharedStyles.inlineEmptyText}>Nenhuma variante cadastrada</Text>
      ) : (
        <View style={styles.variantesBloco}>
          <Pressable
            style={styles.variantesToggle}
            onPress={(): void => setVariantesAbertas((atual) => !atual)}
          >
            <Text style={styles.variantesToggleText}>
              {variantes.length} {variantes.length === 1 ? 'variante' : 'variantes'}
            </Text>
            <Ionicons
              name={variantesAbertas ? 'chevron-up' : 'chevron-down'}
              size={iconSize.sm}
              color={colors.primaryDark}
            />
          </Pressable>

          {variantesAbertas && (
            <View style={styles.variantesLista}>
              {variantes.map((variante) => (
                <Text key={variante.id} style={sharedStyles.listCardDetail}>
                  {`${nomeMarca(variante.marca_id) || 'Sem marca'} • ${toCurrency(variante.preco)}${
                    variante.codigo_barras ? ` • ${variante.codigo_barras}` : ''
                  }`}
                </Text>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  titulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  preco: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  eventual: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  categoriaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  categoriaChip: {
    backgroundColor: colors.primarySoft,
    borderRadius: 16,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  categoriaChipText: {
    fontSize: fontSize.caption,
    color: colors.primary,
    fontWeight: fontWeight.medium,
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
    color: colors.primaryDark,
  },
  variantesLista: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
});
