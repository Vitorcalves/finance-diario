import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ScreenHeader } from '../../../components/ui';
import { type HistoricoPreco, listHistoricoPreco } from '../../../models/historicoPreco';
import type { Produto } from '../../../models/produtos';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { colors, fontSize, fontWeight, sharedStyles } from '../../../theme';
import { formatarDataHora, toCurrency } from '../../../utils/format';

type HistoricoProdutoModalProps = {
  produto: Produto;
  variantes: ProdutoVariantes[];
  nomeMarca: (id: number | null) => string;
  onFechar: () => void;
};

/** Historico de precos de um produto, aberto pelo icone de olho da lista. */
export default function HistoricoProdutoModal({
  produto,
  variantes,
  nomeMarca,
  onFechar,
}: HistoricoProdutoModalProps): React.ReactNode {
  const [registros, setRegistros] = useState<HistoricoPreco[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    void (async (): Promise<void> => {
      try {
        const historico = await listHistoricoPreco();

        if (ativo) {
          setRegistros(historico.filter((registro) => registro.produto_id === produto.id));
        }
      } catch (error: unknown) {
        console.error('Erro ao carregar histórico:', error);
        Alert.alert('Erro', 'Não foi possível carregar o histórico de preços');
      } finally {
        if (ativo) {
          setLoading(false);
        }
      }
    })();

    return (): void => {
      ativo = false;
    };
  }, [produto.id]);

  const rotuloDoRegistro = (registro: HistoricoPreco): string => {
    const variante = variantes.find((item) => item.id === registro.variante_id);

    if (!variante) {
      return 'Preço base';
    }

    return nomeMarca(variante.marca_id) || 'Variante sem marca';
  };

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onFechar}>
      <SafeAreaView style={sharedStyles.screen}>
        <ScreenHeader
          title="Histórico de Preços"
          subtitle={produto.nome}
          backIcon="close"
          onBack={onFechar}
        />

        {loading ? (
          <LoadingState />
        ) : registros.length === 0 ? (
          <EmptyState icon="time-outline" message="Nenhum histórico de preço" />
        ) : (
          <ScrollView
            style={sharedStyles.scrollArea}
            contentContainerStyle={sharedStyles.listContent}
          >
            {registros.map((registro) => (
              <View key={registro.id} style={sharedStyles.listCard}>
                <View style={sharedStyles.listCardInfo}>
                  <Text style={styles.preco}>{toCurrency(registro.preco)}</Text>
                  <Text style={sharedStyles.listCardDetail}>{rotuloDoRegistro(registro)}</Text>
                  <Text style={styles.data}>{formatarDataHora(registro.data)}</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  preco: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  data: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
});
