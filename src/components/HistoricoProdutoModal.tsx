import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { listHistoricoPorProduto, listPrecosPagosPorProduto } from '../models/dashboard';
import { listEmpresas } from '../models/empresas';
import type { Marca } from '../models/marcas';
import { listProdutoVariantesByProduto, type ProdutoVariantes } from '../models/produtoVariantes';
import { fontSize, fontWeight, makeStyles, spacing, useTheme } from '../theme';
import { formatarData, toCurrency, toCurrencyPorUnidade } from '../utils/format';
import { precoPorUnidadePrimaria, rotuloQuantidade, rotuloVariantePorId } from '../utils/variantes';
import { BottomSheet, ChipSelector, SegmentedControl, Text } from './ui';

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
  /** Variantes do produto, com as excluidas: o registro antigo continua com rotulo. */
  variantes: ProdutoVariantes[];
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
  /** Variantes ativas: viram os chips do filtro. */
  variantes: ProdutoVariantes[];
  /** Com as excluidas, que continuam no rotulo das variantes que as usam. */
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
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [filtro, setFiltro] = useState<string>(TODAS);
  const [mostrarCompras, setMostrarCompras] = useState(false);
  /** O painel anima a saida antes de avisar a tela, que entao o desmonta. */
  const [visivel, setVisivel] = useState(true);
  const [dados, setDados] = useState<Dados | null>(null);

  useEffect(() => {
    let ativo = true;

    void (async (): Promise<void> => {
      try {
        const [historico, pagos, empresas, variantesDoProduto] = await Promise.all([
          listHistoricoPorProduto(produtoId),
          listPrecosPagosPorProduto(produtoId),
          // Com os excluidos: o registro antigo continua com mercado e variante.
          listEmpresas({ comExcluidos: true }),
          listProdutoVariantesByProduto(produtoId, { comExcluidos: true }),
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
          variantes: variantesDoProduto,
        });
      } catch (error: unknown) {
        console.error('Erro ao carregar historico do produto:', error);
        Alert.alert('Erro', 'Não foi possível carregar o histórico do produto');

        if (ativo) {
          setDados({ precos: [], compras: [], nomesEmpresas: new Map(), variantes: [] });
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

  const variantesDoHistorico = dados?.variantes ?? variantes;

  const renderRegistro = (registro: Registro): React.ReactNode => {
    const variante = variantesDoHistorico.find((opcao) => opcao.id === registro.varianteId);
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
                ? rotuloVariantePorId(registro.varianteId, variantesDoHistorico, marcas)
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
    <BottomSheet
      visivel={visivel}
      onFechar={(): void => setVisivel(false)}
      aoTerminarDeFechar={onFechar}
      titulo={mostrarCompras ? 'Histórico de compras' : 'Histórico de preços'}
      subtitulo={subtitulo}
    >
      <View style={styles.controles}>
        <SegmentedControl
          opcoes={[
            { valor: 'precos', rotulo: 'Preços registrados' },
            { valor: 'compras', rotulo: 'Compras' },
          ]}
          valor={mostrarCompras ? 'compras' : 'precos'}
          onChange={(valor): void => setMostrarCompras(valor === 'compras')}
        />

        <ChipSelector opcoes={opcoes} selecionado={filtro} onSelecionar={setFiltro} scroll />
      </View>

      {registros === null ? (
        <ActivityIndicator color={colors.primary} />
      ) : registros.length === 0 ? (
        <Text style={sharedStyles.inlineEmptyText}>
          {mostrarCompras ? 'Nenhuma compra lançada.' : 'Nenhum preço registrado.'}
        </Text>
      ) : (
        <View>{registros.map(renderRegistro)}</View>
      )}
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  controles: {
    gap: spacing.sm,
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
    color: colors.text,
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
}));
