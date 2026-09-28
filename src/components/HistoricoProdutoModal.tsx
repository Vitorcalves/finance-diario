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
import { listHistoricoPorProduto, listPrecosPagosPorProduto } from '../models/dashboard';
import { listEmpresas } from '../models/empresas';
import type { Marca } from '../models/marcas';
import type { ProdutoVariantes } from '../models/produtoVariantes';
import {
  colors,
  fontSize,
  fontWeight,
  iconSize,
  radius,
  shadows,
  sharedStyles,
  spacing,
} from '../theme';
import { formatarData, toCurrency, toCurrencyPorUnidade } from '../utils/format';
import { precoPorUnidadePrimaria, rotuloQuantidade, rotuloVariantePorId } from '../utils/variantes';
import { ChipSelector, IconButton } from './ui';

/** Chip "Produto" junta todas as variantes; os demais chips sao ids de variante. */
const TODAS = 'produto';

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

type Dados = {
  precos: Registro[];
  compras: Registro[];
  nomesEmpresas: Map<string, string>;
};

type HistoricoProdutoModalProps = {
  produtoId: string;
  /** Texto abaixo do titulo (nome do produto ou descricao do item). */
  subtitulo: string;
  /**
   * Variante em foco (item do orcamento): vira um unico chip "Variante".
   * Sem ela, cada variante do produto ganha o seu chip.
   */
  varianteId?: string;
  variantes: ProdutoVariantes[];
  marcas: Marca[];
  onFechar: () => void;
};

/**
 * Historico de um produto em janela flutuante, aberto pelo icone de olho.
 * O switch troca entre os precos registrados e as compras lancadas; os chips
 * filtram por variante.
 */
export default function HistoricoProdutoModal({
  produtoId,
  subtitulo,
  varianteId,
  variantes,
  marcas,
  onFechar,
}: HistoricoProdutoModalProps): React.ReactNode {
  const [filtro, setFiltro] = useState<string>(TODAS);
  const [mostrarCompras, setMostrarCompras] = useState(false);
  const [dados, setDados] = useState<Dados | null>(null);

  useEffect(() => {
    let ativo = true;

    void (async (): Promise<void> => {
      try {
        const [historico, pagos, empresas] = await Promise.all([
          listHistoricoPorProduto(produtoId),
          listPrecosPagosPorProduto(produtoId),
          listEmpresas(),
        ]);

        if (!ativo) {
          return;
        }

        // As consultas vem do mais antigo ao mais recente; a lista mostra o inverso.
        setDados({
          precos: historico.reverse().map((registro) => ({
            id: registro.id,
            varianteId: registro.variante_id,
            empresaId: registro.empresa_id,
            preco: registro.preco,
            data: registro.data,
            quantidade: null,
          })),
          compras: pagos.reverse().map((pago) => ({
            id: pago.item_id,
            varianteId: pago.variante_id,
            empresaId: pago.empresa_id,
            preco: pago.preco,
            data: pago.data,
            quantidade: pago.quantidade,
          })),
          nomesEmpresas: new Map(empresas.map((empresa) => [empresa.id, empresa.nome])),
        });
      } catch (error: unknown) {
        console.error('Erro ao carregar historico do produto:', error);
        Alert.alert('Erro', 'Nao foi possivel carregar o historico do produto');

        if (ativo) {
          setDados({ precos: [], compras: [], nomesEmpresas: new Map() });
        }
      }
    })();

    return (): void => {
      ativo = false;
    };
  }, [produtoId]);

  const opcoes = [
    { valor: TODAS, rotulo: 'Produto' },
    ...(varianteId
      ? [{ valor: varianteId, rotulo: 'Variante' }]
      : variantes
          .filter((variante) => variante.produto_id === produtoId)
          .map((variante) => ({
            valor: variante.id,
            rotulo: rotuloVariantePorId(variante.id, variantes, marcas),
          }))),
  ];

  const fonte = dados && (mostrarCompras ? dados.compras : dados.precos);
  const registros =
    fonte && filtro !== TODAS ? fonte.filter((registro) => registro.varianteId === filtro) : fonte;

  const renderRegistro = (registro: Registro): React.ReactNode => {
    const variante = variantes.find((opcao) => opcao.id === registro.varianteId);
    const unitario = precoPorUnidadePrimaria(registro.preco, variante);
    const detalhes = [
      (registro.empresaId ? dados?.nomesEmpresas.get(registro.empresaId) : undefined) ??
        'Sem mercado',
      formatarData(registro.data),
    ];

    if (registro.quantidade !== null) {
      detalhes.unshift(`Qtd. ${rotuloQuantidade(registro.quantidade, variante)}`);
    }

    return (
      <View key={registro.id} style={styles.registro}>
        <View style={styles.registroInfo}>
          {filtro === TODAS && (
            <Text style={styles.variante}>
              {registro.varianteId
                ? rotuloVariantePorId(registro.varianteId, variantes, marcas)
                : 'Sem variante'}
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
              <Text style={sharedStyles.listCardDetail}>{subtitulo}</Text>
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

          <ChipSelector opcoes={opcoes} selecionado={filtro} onSelecionar={setFiltro} scroll />

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
