import { StyleSheet, Text, View } from 'react-native';
import { IconButton } from '../../../components/ui';
import type { Produto } from '../../../models/produtos';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { colors, fontSize, fontWeight, sharedStyles, spacing } from '../../../theme';
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
  return (
    <View style={[sharedStyles.listCard, styles.card]}>
      <View style={sharedStyles.listCardInfo}>
        <Text style={sharedStyles.listCardTitle}>{produto.nome}</Text>
        <Text style={styles.preco}>
          {toCurrency(produto.preco)}
          {produto.unidade_id !== null ? ` / ${nomeUnidade(produto.unidade_id)}` : ''}
        </Text>

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
          variantes.map((variante) => (
            <Text key={variante.id} style={sharedStyles.listCardDetail}>
              {`${nomeMarca(variante.marca_id) || 'Sem marca'} • ${toCurrency(variante.preco)}${
                variante.codigo_barras ? ` • ${variante.codigo_barras}` : ''
              }`}
            </Text>
          ))
        )}
      </View>

      <View style={sharedStyles.iconButtonRow}>
        <IconButton icon="eye" variant="info" onPress={onVerHistorico} />
        <IconButton icon="pencil" variant="primary" onPress={onEditar} />
        <IconButton icon="trash" variant="danger" onPress={onDeletar} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'flex-start',
  },
  preco: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  categoriaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
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
});
