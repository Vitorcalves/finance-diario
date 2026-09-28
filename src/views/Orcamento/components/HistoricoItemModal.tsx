import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { ChipSelector, IconButton } from '../../../components/ui';
import { listPrecosPagosPorProduto } from '../../../models/dashboard';
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

/** Linha da lista: um preco registrado ou um item efetivamente comprado. */
type Registro = {
  id: string;
  varianteId: string | null;
  empresaId: string | null;
  preco: number;
  data: string;
  /** So nas compras: quanto foi levado. */
  quantidade: number | null;
};

type HistoricoItemModalProps = {
  item: ItemOrcamento;
  /** Historico do produto inteiro, ja ordenado do mais recente para o mais antigo. */
  historico: HistoricoPreco[];
  variantes: ProdutoVariantes[];
  rotuloVariante: (varianteId: string) => string;
  rotuloQuantidade: (quantidade: number, varianteId: string) => string;
  nomeEmpresa: (id: string | null) => string;
  onFechar: () => void;
};

/**
 * Historico de um item do orcamento, aberto pelo icone de olho do card.
 * A aba "Produto" junta todas as variantes; a aba "Variante" so a do item.
 * O switch troca entre os precos registrados e as compras lancadas.
 */
export default function HistoricoItemModal({
  item,
  historico,
  variantes,
  rotuloVariante,
  rotuloQuantidade,
  nomeEmpresa,
  onFechar,
}: HistoricoItemModalProps): React.ReactNode {
  const [aba, setAba] = useState<Aba>('produto');
  const [mostrarCompras, setMostrarCompras] = useState(false);
  const [compras, setCompras] = useState<Registro[] | null>(null);

  useEffect(() => {
    let ativo = true;

    void (async (): Promise<void> => {
      try {
        const pagos = await listPrecosPagosPorProduto(item.produtoId);

        if (ativo) {
          setCompras(
            pagos.reverse().map((pago) => ({
              id: pago.item_id,
              varianteId: pago.variante_id,
              empresaId: pago.empresa_id,
              preco: pago.preco,
              data: pago.data,
              quantidade: pago.quantidade,
            })),
          );
        }
      } catch (error: unknown) {
        console.error('Erro ao carregar compras do produto:', error);
        Alert.alert('Erro', 'Nao foi possivel carregar as compras do produto');

        if (ativo) {
          setCompras([]);
        }
      }
    })();

    return (): void => {
      ativo = false;
    };
  }, [item.produtoId]);

  const precos: Registro[] = historico.map((registro) => ({
    id: registro.id,
    varianteId: registro.variante_id,
    empresaId: registro.empresa_id,
    preco: registro.preco,
    data: registro.data,
    quantidade: null,
  }));

  const fonte = mostrarCompras ? compras : precos;
  const registros =
    fonte && aba === 'variante'
      ? fonte.filter((registro) => registro.varianteId === item.varianteId)
      : fonte;

  const renderRegistro = (registro: Registro): React.ReactNode => {
    const variante = variantes.find((opcao) => opcao.id === registro.varianteId);
    const unitario = precoPorUnidadePrimaria(registro.preco, variante);
    const detalhes = [nomeEmpresa(registro.empresaId), formatarData(registro.data)];

    if (registro.quantidade !== null) {
      detalhes.unshift(`Qtd. ${rotuloQuantidade(registro.quantidade, registro.varianteId ?? '')}`);
    }

    return (
      <View key={registro.id} style={styles.registro}>
        <View style={styles.registroInfo}>
          {aba === 'produto' && (
            <Text style={styles.variante}>
              {registro.varianteId ? rotuloVariante(registro.varianteId) : 'Sem variante'}
            </Text>
          )}
          <Text style={styles.detalhe}>{detalhes.join(' • ')}</Text>
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
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onFechar}>
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onFechar} />

        <View style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerInfo}>
              <Text style={sharedStyles.sectionTitle}>
                {mostrarCompras ? 'Historico de compras' : 'Historico de precos'}
              </Text>
              <Text style={sharedStyles.listCardDetail}>{item.descricao}</Text>
            </View>
            <IconButton icon="close" size={iconSize.sm} onPress={onFechar} />
          </View>

          <View style={styles.linhaSwitch}>
            <Text style={sharedStyles.label}>Mostrar compras</Text>
            <Switch
              value={mostrarCompras}
              onValueChange={setMostrarCompras}
              trackColor={{ false: colors.borderStrong, true: colors.primary }}
              thumbColor={colors.surface}
            />
          </View>

          <ChipSelector opcoes={ABAS} selecionado={aba} onSelecionar={setAba} />

          {registros === null ? (
            <ActivityIndicator color={colors.primary} />
          ) : registros.length === 0 ? (
            <Text style={sharedStyles.inlineEmptyText}>
              {mostrarCompras ? 'Nenhuma compra lancada.' : 'Nenhum preco registrado.'}
            </Text>
          ) : (
            <ScrollView style={styles.lista}>{registros.map(renderRegistro)}</ScrollView>
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
  linhaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
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
