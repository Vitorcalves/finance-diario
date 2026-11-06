import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { RefreshControl, type TextInput as RNTextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import ScannerCodigoBarras from '../../components/ScannerCodigoBarras';
import {
  EmptyState,
  KeyboardAvoidingScreen,
  LoadingState,
  MenuAcoes,
  OpcoesSheet,
  type OpcaoSheet,
  PressableScale,
  ScreenHeader,
  ScrollComTeclado,
  Text,
} from '../../components/ui';
import type { ItemListaCompras } from '../../models/listaCompras';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  shadows,
  spacing,
  useTheme,
} from '../../theme';
import { rotuloVariante } from '../../utils/variantes';
import NovoLancamentoForm from '../Home/components/NovoLancamentoForm';
import type { RascunhoLancamento } from '../Home/types';
import AdicionarRapido from './components/AdicionarRapido';
import ItemListaForm from './components/ItemListaForm';
import ItemListaRow, { CAIXA } from './components/ItemListaRow';
import MercadosLista from './components/MercadosLista';
import RodapeLista from './components/RodapeLista';
import SugestoesLista from './components/SugestoesLista';
import { type ItemNaLista, useListaCompras } from './useListaCompras';

/** Opcao "nao informada" do painel de marca. */
const SEM_MARCA = '__sem_marca__';

/**
 * Lista de compras como pesquisa de precos: monta a lista, anota o preco de
 * cada item (de cada marca/embalagem, se quiser comparar) em cada mercado
 * visitado e compara lado a lado. No mercado escolhido, os itens vao para o
 * carrinho e a compra vira um lancamento.
 */
export default function ListaComprasView(): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation();
  const lista = useListaCompras();
  const { pendentes, comprados, totais, mercadoAtual } = lista;

  const [formAberto, setFormAberto] = useState(false);
  /** Nova chave a cada abertura: o formulario nasce com os dados do item. */
  const [formKey, setFormKey] = useState(0);
  const [editando, setEditando] = useState<ItemListaCompras | null>(null);
  /** Marca ja sabida ao abrir o item (lida pelo codigo de barras). */
  const [marcaInicial, setMarcaInicial] = useState<{
    empresaId: string;
    varianteId: string;
  } | null>(null);
  /** Cotacao cuja marca esta sendo escolhida no painel. */
  const [marcaDe, setMarcaDe] = useState<{ cotacaoId: string; produtoId: string } | null>(null);
  const [painelMarca, setPainelMarca] = useState(false);
  const [scannerAberto, setScannerAberto] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);
  const [rascunho, setRascunho] = useState<RascunhoLancamento | null>(null);
  /** Cada fechamento remonta o formulario com o carrinho atual. */
  const [fechamentoKey, setFechamentoKey] = useState(0);
  const [fechamentoAberto, setFechamentoAberto] = useState(false);
  /** Campos de preco pelo id do item, para o "proximo" do teclado (nao afeta a renderizacao). */
  const [campos] = useState(() => new Map<string, RNTextInput>());

  const vazia = pendentes.length === 0 && comprados.length === 0;
  // Item com varias marcas cotadas aqui nao tem campo na linha: o "proximo" pula ele.
  const ordemDosCampos = [...pendentes, ...comprados]
    .filter((entrada) => entrada.cotacoesAtual <= 1)
    .map((entrada) => entrada.item.id);

  const produtosNaLista = useMemo(
    () =>
      new Set(
        pendentes
          .map((entrada) => entrada.item.produto_id)
          .filter((id): id is string => id !== null),
      ),
    [pendentes],
  );

  const mercadosDoForm = useMemo(
    () => lista.mercados.map((mercado) => ({ empresaId: mercado.empresaId, nome: mercado.nome })),
    [lista.mercados],
  );

  const opcoesMarca: OpcaoSheet<string>[] = marcaDe
    ? [
        {
          valor: SEM_MARCA,
          rotulo: 'Não informada',
          descricao: 'Sem a marca, este preço não vai para o histórico',
        },
        ...lista.variantes
          .filter((variante) => variante.produto_id === marcaDe.produtoId)
          .map((variante) => ({
            valor: variante.id,
            rotulo: rotuloVariante(variante, lista.marcas),
          })),
      ]
    : [];

  const abrirItem = (
    item: ItemListaCompras | null,
    marca: { empresaId: string; varianteId: string } | null = null,
  ): void => {
    setEditando(item);
    setMarcaInicial(marca);
    setFormKey((atual) => atual + 1);
    setFormAberto(true);
  };

  const finalizar = (): void => {
    const montado = lista.iniciarFechamento();

    if (montado) {
      setRascunho(montado);
      setFechamentoKey((atual) => atual + 1);
      setFechamentoAberto(true);
    }
  };

  const proximoCampo = (itemId: string): (() => void) | undefined => {
    const seguinte = ordemDosCampos[ordemDosCampos.indexOf(itemId) + 1];
    return seguinte ? (): void => campos.get(seguinte)?.focus() : undefined;
  };

  const cabecalhoSecao = (titulo: string): React.ReactNode => (
    <View style={styles.cabecalhoSecao}>
      <Text style={styles.tituloSecao}>{titulo}</Text>
      {lista.nomeMercadoAtual && (
        <Text style={styles.tituloPreco} numberOfLines={1}>
          {`Preço · ${lista.nomeMercadoAtual}`}
        </Text>
      )}
    </View>
  );

  const grupo = (entradas: ItemNaLista[]): React.ReactNode => (
    <View style={styles.grupo}>
      {entradas.map((entrada, indice) => (
        <View key={entrada.item.id}>
          {indice > 0 && <View style={styles.divisor} />}
          <ItemListaRow
            entrada={entrada}
            mercadoAtual={mercadoAtual}
            primeiro={indice === 0}
            ultimo={indice === entradas.length - 1}
            onAlternar={(): void => lista.alternarComprado(entrada)}
            onEditar={(): void => abrirItem(entrada.item)}
            onRemover={(): void => lista.remover(entrada.item)}
            onPreco={(preco): void => {
              if (mercadoAtual) {
                lista.definirPreco(entrada.item, mercadoAtual, preco);
              }
            }}
            campoRef={(campo): void => {
              if (campo) {
                campos.set(entrada.item.id, campo);
              } else {
                campos.delete(entrada.item.id);
              }
            }}
            onProximo={proximoCampo(entrada.item.id)}
            onEscolherMarca={(): void => {
              if (entrada.cotacaoAtual && entrada.item.produto_id) {
                setMarcaDe({
                  cotacaoId: entrada.cotacaoAtual.cotacao.id,
                  produtoId: entrada.item.produto_id,
                });
                setPainelMarca(true);
              }
            }}
          />
        </View>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Lista de compras"
        subtitle={
          vazia ? undefined : `${totais.pendentes} a comprar · ${totais.comprados} no carrinho`
        }
        onBack={(): void => navigation.goBack()}
        right={
          <PressableScale
            style={sharedStyles.headerAction}
            onPress={(): void => setMenuAberto(true)}
            escala={0.9}
            accessibilityRole="button"
            accessibilityLabel="Mais ações"
          >
            <Ionicons name="ellipsis-horizontal" size={iconSize.md} color={colors.textStrong} />
          </PressableScale>
        }
      />

      {lista.loading ? (
        <LoadingState message="Carregando a lista..." />
      ) : (
        <KeyboardAvoidingScreen>
          <ScrollComTeclado
            style={sharedStyles.scrollArea}
            contentContainerStyle={sharedStyles.scrollContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={
              <RefreshControl
                refreshing={lista.atualizando}
                onRefresh={lista.atualizar}
                colors={[colors.primary]}
                tintColor={colors.primary}
                progressBackgroundColor={colors.surface}
              />
            }
          >
            <AdicionarRapido
              produtos={lista.produtos}
              naLista={produtosNaLista}
              onAdicionar={lista.adicionarRapido}
              onLerCodigo={(): void => setScannerAberto(true)}
            />

            <SugestoesLista sugestoes={lista.sugestoes} onAdicionar={lista.adicionarSugestoes} />

            <MercadosLista
              mercados={lista.mercados}
              comparacao={lista.comparacao}
              totalItens={totais.itens}
              empresas={lista.empresas}
              onEscolherAtual={lista.escolherMercadoAtual}
              onAlternarMercado={lista.alternarMercado}
            />

            {vazia ? (
              <EmptyState
                icon="cart-outline"
                message="Sua lista está vazia"
                hint="Adicione o que precisa comprar. Em cada mercado, toque nele em Mercados e anote os preços (de várias marcas, se quiser comparar). A lista mostra onde cada item e a compra toda saem mais baratos."
              />
            ) : (
              <>
                {cabecalhoSecao(`A comprar (${pendentes.length})`)}
                {pendentes.length > 0 ? (
                  grupo(pendentes)
                ) : (
                  <Text style={sharedStyles.inlineEmptyText}>
                    Tudo no carrinho. Finalize para registrar a compra.
                  </Text>
                )}

                {comprados.length > 0 && (
                  <>
                    {cabecalhoSecao(`No carrinho (${comprados.length})`)}
                    {grupo(comprados)}
                  </>
                )}

                <Text style={styles.dica}>
                  {mercadoAtual
                    ? 'Digite o preço ao lado de cada item. Toque no item para comparar marcas e embalagens e ver os preços de todos os mercados; deslize para excluir.'
                    : 'Toque em um mercado acima para anotar os preços dele. Toque no item para editar; deslize para excluir.'}
                </Text>
              </>
            )}
          </ScrollComTeclado>

          {!vazia && (
            <RodapeLista
              totais={totais}
              nomeMercadoAtual={lista.nomeMercadoAtual}
              onFinalizar={finalizar}
            />
          )}
        </KeyboardAvoidingScreen>
      )}

      <ItemListaForm
        key={`item-${formKey}`}
        visivel={formAberto}
        item={editando}
        produtos={lista.produtos}
        variantes={lista.variantes}
        marcas={lista.marcas}
        mercados={mercadosDoForm}
        mercadoAtual={mercadoAtual}
        cotacoes={editando ? lista.cotacoesDoItem(editando.id) : []}
        marcaInicial={marcaInicial}
        referenciaNoMercado={lista.referenciaNoMercado}
        menorPrecoVisto={lista.menorPrecoVisto}
        precoBase={lista.precoBase}
        unitarioDe={lista.unitarioDe}
        nomeEmpresa={lista.nomeEmpresa}
        onFechar={(): void => setFormAberto(false)}
        onSalvar={lista.salvarItem}
      />

      <MenuAcoes
        visivel={menuAberto}
        titulo="Lista de compras"
        acoes={[
          {
            rotulo: 'Adicionar item com detalhes',
            icone: 'add-circle-outline',
            onPress: (): void => abrirItem(null),
          },
          {
            rotulo: 'Ler código de barras',
            icone: 'barcode-outline',
            onPress: (): void => setScannerAberto(true),
          },
          ...(vazia
            ? []
            : [
                {
                  rotulo: 'Salvar preços no histórico',
                  icone: 'cloud-done-outline' as const,
                  onPress: lista.registrarPrecosNoHistorico,
                },
                {
                  rotulo: 'Apagar preços anotados',
                  icone: 'pricetags-outline' as const,
                  onPress: lista.apagarPrecos,
                },
                {
                  rotulo: 'Tirar da lista o que está no carrinho',
                  icone: 'checkmark-done-outline' as const,
                  onPress: lista.limparComprados,
                },
                {
                  rotulo: 'Esvaziar lista',
                  icone: 'trash-outline' as const,
                  perigo: true,
                  onPress: lista.esvaziarLista,
                },
              ]),
        ]}
        onFechar={(): void => setMenuAberto(false)}
      />

      <OpcoesSheet
        visivel={painelMarca}
        titulo={`Marca vista em ${lista.nomeMercadoAtual ?? 'mercado'}`}
        opcoes={opcoesMarca}
        selecionado={
          marcaDe ? (lista.cotacaoPorId(marcaDe.cotacaoId)?.variante_id ?? SEM_MARCA) : SEM_MARCA
        }
        onSelecionar={(valor): void => {
          if (marcaDe) {
            lista.definirVarianteCotacao(marcaDe.cotacaoId, valor === SEM_MARCA ? null : valor);
          }
        }}
        onFechar={(): void => setPainelMarca(false)}
      />

      <NovoLancamentoForm
        key={`fechamento-${fechamentoKey}`}
        visivel={fechamentoAberto}
        rascunho={rascunho}
        onFechar={(): void => setFechamentoAberto(false)}
        onAddLancamento={lista.registrarCompra}
        mensagemSucesso={
          lista.pesquisaSalva > 0
            ? `Compra registrada. ${lista.pesquisaSalva} ${lista.pesquisaSalva === 1 ? 'preço da pesquisa foi' : 'preços da pesquisa foram'} para o histórico.`
            : 'Compra registrada; os itens comprados saíram da lista'
        }
      />

      {scannerAberto && (
        <ScannerCodigoBarras
          onLer={(codigo): void => {
            setScannerAberto(false);
            const lido = lista.lerCodigo(codigo.trim());

            if (lido) {
              // O preco anotado aqui ja sai com a marca do codigo lido.
              abrirItem(
                lido.item,
                mercadoAtual ? { empresaId: mercadoAtual, varianteId: lido.varianteId } : null,
              );
            }
          }}
          onFechar={(): void => setScannerAberto(false)}
        />
      )}
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  cabecalhoSecao: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: spacing.xs,
    marginTop: spacing.sm,
  },
  tituloSecao: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  tituloPreco: {
    flexShrink: 1,
    fontSize: fontSize.caption,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  grupo: {
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  divisor: {
    height: 1,
    marginLeft: spacing.lg + CAIXA + spacing.md,
    backgroundColor: colors.divider,
  },
  dica: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
}));
