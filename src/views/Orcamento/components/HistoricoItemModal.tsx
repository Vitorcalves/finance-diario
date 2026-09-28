import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ChipSelector, IconButton } from '../../../components/ui';
import type { HistoricoPreco } from '../../../models/historicoPreco';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import {
  colors,
  fontSize,
  fontWeight,
  iconSize,
  radius,
  shadows,
  sharedStyles,
  spacing,
} from '../../../theme';
import { formatarData, toCurrency, toCurrencyPorUnidade } from '../../../utils/format';
import { precoPorUnidadePrimaria } from '../../../utils/variantes';
import type { ItemOrcamento } from '../types';

type Aba = 'produto' | 'variante';

const ABAS = [
  { valor: 'produto' as const, rotulo: 'Produto' },
  { valor: 'variante' as const, rotulo: 'Variante' },
];

type HistoricoItemModalProps = {
  item: ItemOrcamento;
  /** Historico do produto inteiro, ja ordenado do mais recente para o mais antigo. */
  historico: HistoricoPreco[];
  variantes: ProdutoVariantes[];
  rotuloVariante: (varianteId: string) => string;
  nomeEmpresa: (id: string | null) => string;
  onFechar: () => void;
};

/**
 * Historico de precos de um item do orcamento, aberto pelo icone de olho do card.
 * A aba "Produto" junta todas as variantes; a aba "Variante" so a do item.
 */
export default function HistoricoItemModal({
  item,
  historico,
  variantes,
  rotuloVariante,
  nomeEmpresa,
  onFechar,
}: HistoricoItemModalProps): React.ReactNode {
  const [aba, setAba] = useState<Aba>('produto');

  const registros =
    aba === 'produto'
      ? historico
      : historico.filter((registro) => registro.variante_id === item.varianteId);

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onFechar} />

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={sharedStyles.sectionTitle}>Historico de precos</Text>
              <Text style={sharedStyles.listCardDetail}>{item.descricao}</Text>
            </View>
            <IconButton icon="close" size={iconSize.sm} onPress={onFechar} />
          </View>

          <ChipSelector opcoes={ABAS} selecionado={aba} onSelecionar={setAba} />

          {registros.length === 0 ? (
            <Text style={sharedStyles.inlineEmptyText}>Nenhum preco registrado.</Text>
          ) : (
            <ScrollView style={styles.lista}>
              {registros.map((registro) => {
                const unitario = precoPorUnidadePrimaria(
                  registro.preco,
                  variantes.find((variante) => variante.id === registro.variante_id),
                );

                return (
                  <View key={registro.id} style={styles.registro}>
                    <View style={styles.registroInfo}>
                      {aba === 'produto' && (
                        <Text style={styles.variante}>{rotuloVariante(registro.variante_id)}</Text>
                      )}
                      <Text style={styles.detalhe}>
                        {`${nomeEmpresa(registro.empresa_id)} • ${formatarData(registro.data)}`}
                      </Text>
                    </View>

                    <View style={styles.valores}>
                      <Text style={styles.preco}>{toCurrency(registro.preco)}</Text>
                      {unitario && (
                        <Text style={styles.unitario}>
                          {toCurrencyPorUnidade(unitario.valor, unitario.sigla)}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: colors.overlay,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
    maxHeight: '80%',
    ...shadows.floating,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  headerInfo: {
    flex: 1,
  },
  lista: {
    flexGrow: 0,
  },
  registro: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  registroInfo: {
    flex: 1,
  },
  variante: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    color: colors.textBody,
  },
  detalhe: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  valores: {
    alignItems: 'flex-end',
  },
  preco: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  unitario: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
});
