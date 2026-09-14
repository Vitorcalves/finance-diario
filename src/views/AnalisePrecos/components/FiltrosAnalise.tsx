import { StyleSheet, Text, View } from 'react-native';
import { ChipSelector } from '../../../components/ui';
import type { ProdutoComMovimento } from '../../../models/dashboard';
import { sharedStyles, spacing } from '../../../theme';

type FiltrosAnaliseProps = {
  produtos: ProdutoComMovimento[];
  produtoId: string | null;
  onSelecionarProduto: (id: string) => void;
  variantes: { id: string; rotulo: string }[];
  varianteId: string | null;
  onSelecionarVariante: (id: string | null) => void;
};

/** Valor do chip "Todas"; os ids reais sao UUIDs e nunca colidem com ele. */
const TODAS = '__todas__';

/** Escolha do produto e, quando ele tem mais de uma, da variante analisada. */
export default function FiltrosAnalise({
  produtos,
  produtoId,
  onSelecionarProduto,
  variantes,
  varianteId,
  onSelecionarVariante,
}: FiltrosAnaliseProps): React.ReactNode {
  return (
    <View style={styles.container}>
      <Text style={sharedStyles.label}>Produto</Text>
      <ChipSelector
        scroll
        opcoes={produtos.map((produto) => ({ valor: produto.id, rotulo: produto.nome }))}
        selecionado={produtoId}
        onSelecionar={onSelecionarProduto}
      />

      {variantes.length > 1 && (
        <>
          <Text style={sharedStyles.label}>Variante</Text>
          <ChipSelector
            scroll
            opcoes={[
              { valor: TODAS, rotulo: 'Todas' },
              ...variantes.map((variante) => ({ valor: variante.id, rotulo: variante.rotulo })),
            ]}
            selecionado={varianteId ?? TODAS}
            onSelecionar={(valor): void => onSelecionarVariante(valor === TODAS ? null : valor)}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
});
