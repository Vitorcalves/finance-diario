import { useMemo, useState } from 'react';
import { View } from 'react-native';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { BottomSheet, Button, ChipSelector, Text, TextInput } from '../../../components/ui';
import type { HistoricoPreco } from '../../../models/historicoPreco';
import type { ItemListaCompras } from '../../../models/listaCompras';
import type { Marca } from '../../../models/marcas';
import type { Produto } from '../../../models/produtos';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../../../theme';
import type { PrecoEncontrado } from '../../../utils/comparativoMercados';
import {
  formatarData,
  formatarMoeda,
  toCurrency,
  toCurrencyPorUnidade,
} from '../../../utils/format';
import {
  ehGranel,
  medidaGranel,
  type PrecoPorUnidade,
  rotuloVariante,
} from '../../../utils/variantes';
import type { DadosItemLista } from '../useListaCompras';

/** Opcao de variante que aceita qualquer marca/embalagem. */
const QUALQUER = '__qualquer__';

/** Preco anotado sem dizer a marca vista naquele mercado. */
const SEM_MARCA = '__sem_marca__';

type MercadoDoForm = {
  empresaId: string;
  nome: string;
};

type ItemListaFormProps = {
  visivel: boolean;
  /** Item em edicao; `null` cria um novo. */
  item: ItemListaCompras | null;
  produtos: Produto[];
  variantes: ProdutoVariantes[];
  marcas: Marca[];
  /** Mercados comparados, na ordem da lista; cada um ganha um campo de preco. */
  mercados: MercadoDoForm[];
  mercadoAtual: string | null;
  precoAnotado: (itemId: string, empresaId: string) => number | null;
  varianteAnotada: (itemId: string, empresaId: string) => string | null;
  /** Marca ja conhecida para um mercado (ex.: lida pelo codigo de barras). */
  marcaInicial?: { empresaId: string; varianteId: string } | null;
  /** Ultimo preco do historico no mercado (o mesmo "ultimo preco" do orcamento). */
  referenciaNoMercado: (
    item: Pick<ItemListaCompras, 'produto_id' | 'variante_id'>,
    empresaId: string,
  ) => PrecoEncontrado | null;
  menorPrecoVisto: (varianteId: string) => HistoricoPreco | null;
  precoBase: (varianteId: string) => number | null;
  unitarioDe: (preco: number | null, varianteId: string | null) => PrecoPorUnidade | null;
  nomeEmpresa: (id: string | null) => string;
  /** Salva o item e poe outra embalagem do mesmo produto na lista, para comparar. */
  onCompararEmbalagem?: () => void;
  onFechar: () => void;
  /** Devolve `true` quando gravou, o que fecha o painel. */
  onSalvar: (dados: DadosItemLista, editando: ItemListaCompras | null) => boolean;
};

/**
 * Painel de item da lista: produto cadastrado (com ou sem marca definida) ou
 * um texto livre, a quantidade e o preco visto em cada mercado comparado.
 */
export default function ItemListaForm({
  visivel,
  item,
  produtos,
  variantes,
  marcas,
  mercados,
  mercadoAtual,
  precoAnotado,
  varianteAnotada,
  marcaInicial,
  referenciaNoMercado,
  menorPrecoVisto,
  precoBase,
  unitarioDe,
  nomeEmpresa,
  onCompararEmbalagem,
  onFechar,
  onSalvar,
}: ItemListaFormProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [produtoId, setProdutoId] = useState<string | null>(item?.produto_id ?? null);
  const [varianteId, setVarianteId] = useState<string | null>(item?.variante_id ?? null);
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [quantidade, setQuantidade] = useState(item ? String(item.quantidade) : '1');
  /** Texto de cada campo de preco, pelo id do mercado. */
  const [precos, setPrecos] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      mercados.map((mercado) => {
        const anotado = item ? precoAnotado(item.id, mercado.empresaId) : null;
        return [mercado.empresaId, anotado !== null ? anotado.toFixed(2) : ''];
      }),
    ),
  );

  /** Variante vista em cada mercado (opcional), pelo id do mercado. */
  const [marcasPorMercado, setMarcasPorMercado] = useState<Record<string, string | null>>(() => {
    const anotadas: Record<string, string | null> = Object.fromEntries(
      mercados.map((mercado) => [
        mercado.empresaId,
        item ? varianteAnotada(item.id, mercado.empresaId) : null,
      ]),
    );

    if (marcaInicial && !anotadas[marcaInicial.empresaId]) {
      anotadas[marcaInicial.empresaId] = marcaInicial.varianteId;
    }

    return anotadas;
  });

  const variantesDoProduto = useMemo(
    () => (produtoId ? variantes.filter((variante) => variante.produto_id === produtoId) : []),
    [variantes, produtoId],
  );

  const variante = variantes.find((atual) => atual.id === varianteId);
  const granel = ehGranel(variante);
  const medida = variante && granel ? medidaGranel(variante) : '';

  /** Variante do item, ou a unica do produto quando ele so tem uma. */
  const varianteDoItem =
    varianteId ?? (variantesDoProduto.length === 1 ? variantesDoProduto[0].id : null);

  /** Variante que vale para o preco em cada mercado: a anotada ali ou a do item. */
  const varianteNoMercado = (empresaId: string): string | null =>
    (produtoId ? (marcasPorMercado[empresaId] ?? null) : null) ?? varianteDoItem;

  const menorVisto = varianteDoItem ? menorPrecoVisto(varianteDoItem) : null;
  const cadastrado = varianteDoItem ? precoBase(varianteDoItem) : null;

  /** Sem marca no item e com varias variantes: vale dizer a marca vista em cada mercado. */
  const escolheMarca = variantesDoProduto.length > 1 && varianteId === null;

  /** Preço unitário do que está digitado num mercado (null se vazio ou sem medida). */
  const unitarioDoMercado = (empresaId: string): PrecoPorUnidade | null => {
    const valor = Number(precos[empresaId]);
    if (!(valor > 0)) return null;
    return unitarioDe(valor, varianteNoMercado(empresaId));
  };

  const unitarios = mercados.map((m) => unitarioDoMercado(m.empresaId));
  const preenchidos = unitarios.filter((u): u is PrecoPorUnidade => u !== null);

  // Só dá para comparar por unidade se TODOS têm unidade e a MESMA unidade (kg/L/un).
  // Caso contrário (ex.: um mercado em kg e outro em un), cai no preço bruto.
  const mesmaUnidade =
    preenchidos.length > 0 && preenchidos.every((u) => u.sigla === preenchidos[0].sigla);
  const usarUnitario = preenchidos.length > 1 && mesmaUnidade;

  const valores = mercados.map((m) => Number(precos[m.empresaId])).filter((v) => v > 0);

  const menor = usarUnitario
    ? Math.min(...preenchidos.map((u) => u.valor))
    : valores.length > 1
      ? Math.min(...valores)
      : null;
  const selecionarProduto = (id: string): void => {
    if (produtoId === id) {
      setProdutoId(null);
      setVarianteId(null);
      return;
    }

    setProdutoId(id);
    setVarianteId(null);
    // As marcas anotadas eram variantes do produto anterior.
    setMarcasPorMercado({});
    setDescricao(produtos.find((produto) => produto.id === id)?.nome ?? '');
  };

  const selecionarVariante = (id: string): void => {
    const nova = id === QUALQUER ? undefined : variantes.find((atual) => atual.id === id);

    // Trocar entre pacote e granel muda o sentido da quantidade.
    if (ehGranel(nova) !== granel) {
      setQuantidade(ehGranel(nova) ? '' : '1');
    }

    setVarianteId(nova?.id ?? null);
  };

  const salvar = (): boolean => {
    const salvou = onSalvar(
      {
        produtoId,
        varianteId,
        descricao,
        quantidade: Number(quantidade),
        precos: Object.fromEntries(
          mercados.map((mercado) => {
            const valor = Number(precos[mercado.empresaId]);

            return [
              mercado.empresaId,
              {
                preco: valor > 0 ? valor : null,
                varianteId: produtoId ? (marcasPorMercado[mercado.empresaId] ?? null) : null,
              },
            ];
          }),
        ),
      },
      item,
    );

    if (salvou) {
      onFechar();
    }

    return salvou;
  };

  const compararEmbalagem = (): void => {
    // O que foi digitado aqui nao se perde: grava antes de abrir a outra embalagem.
    if (salvar()) {
      onCompararEmbalagem?.();
    }
  };

  return (
    <BottomSheet
      visivel={visivel}
      onFechar={onFechar}
      titulo={item ? 'Editar item' : 'Novo item'}
      subtitulo={item?.comprado ? 'No carrinho' : undefined}
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button
            label={item ? 'Salvar' : 'Adicionar'}
            icon={item ? 'checkmark' : 'add'}
            flex
            onPress={(): void => {
              salvar();
            }}
          />
        </View>
      }
    >
      <SeletorMultiplo
        label="Produto"
        opcoes={produtos.map((produto) => ({
          id: produto.id,
          nome: produto.nome,
          oculta: produto.eventual === 1,
        }))}
        selecionados={produtoId ? [produtoId] : []}
        onToggle={selecionarProduto}
        placeholderBusca="Buscar produto"
        textoTrigger="Selecionar produto"
        textoVazio="Nenhum produto cadastrado"
        textoNenhumEncontrado="Nenhum produto encontrado"
      />

      {produtoId === null ? (
        <View style={sharedStyles.formGroup}>
          <Text style={sharedStyles.label}>Ou escreva o item</Text>
          <TextInput
            style={sharedStyles.input}
            placeholder="Ex.: papel toalha"
            value={descricao}
            onChangeText={setDescricao}
          />
        </View>
      ) : (
        variantesDoProduto.length > 0 && (
          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>Marca / embalagem</Text>
            <ChipSelector
              scroll
              opcoes={[
                { valor: QUALQUER, rotulo: 'Qualquer' },
                ...variantesDoProduto.map((atual) => ({
                  valor: atual.id,
                  rotulo: rotuloVariante(atual, marcas),
                })),
              ]}
              selecionado={varianteId ?? QUALQUER}
              onSelecionar={selecionarVariante}
            />
            {item && onCompararEmbalagem && variantesDoProduto.length > 1 && (
              <Button
                label="Comparar outra embalagem"
                icon="git-compare-outline"
                variant="ghost"
                size="sm"
                style={styles.comparar}
                onPress={compararEmbalagem}
              />
            )}
          </View>
        )
      )}

      {varianteDoItem && (
        <View style={styles.referencias}>
          <Text style={styles.referenciaTexto}>
            {menorVisto
              ? `Menor preço já visto: ${toCurrency(menorVisto.preco)} em ${nomeEmpresa(
                  menorVisto.empresa_id,
                )} (${formatarData(menorVisto.data)})`
              : 'Nenhum preço no histórico para esta variante'}
          </Text>
          {cadastrado !== null && (
            <Text style={styles.referenciaTexto}>
              {`Preço cadastrado: ${toCurrency(cadastrado)}`}
            </Text>
          )}
        </View>
      )}

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>{granel ? `Quantidade (${medida})` : 'Quantidade'}</Text>
        <BrazilianIntegerInput
          value={quantidade}
          onChangeValue={setQuantidade}
          decimalScale={granel ? 3 : 0}
          placeholder={granel ? 'Ex.: 0,750' : 'Ex.: 2'}
          placeholderTextColor={colors.placeholder}
          style={sharedStyles.input}
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>
          {granel ? `Preço por ${medida} em cada mercado` : 'Preço em cada mercado'}
        </Text>

        {escolheMarca && (
          <Text style={[sharedStyles.sectionHint, styles.dicaMarca]}>
            Opcional: diga a marca que viu em cada mercado para o preço também ir ao histórico.
          </Text>
        )}

        {mercados.length === 0 ? (
          <Text style={sharedStyles.inlineEmptyText}>
            Escolha os mercados no card &quot;Mercados&quot; da lista para anotar os preços.
          </Text>
        ) : (
          mercados.map((mercado) => {
            const valor = Number(precos[mercado.empresaId]);
            const u = unitarioDoMercado(mercado.empresaId);
            const ehMenor =
              menor !== null &&
              (usarUnitario
                ? u !== null && u.valor - menor <= 0.005
                : valor > 0 && valor - menor <= 0.005);
            const marca = marcasPorMercado[mercado.empresaId] ?? null;
            const varianteAqui = varianteNoMercado(mercado.empresaId);
            const referencia = referenciaNoMercado(
              { produto_id: produtoId, variante_id: varianteAqui },
              mercado.empresaId,
            );
            const dica = referencia?.preco ?? null;
            const unitario = unitarioDe(valor > 0 ? valor : null, varianteAqui);

            return (
              <View key={mercado.empresaId} style={styles.blocoMercado}>
                <View style={styles.linhaPreco}>
                  <View style={styles.mercado}>
                    <Text style={styles.mercadoNome} numberOfLines={1}>
                      {mercado.nome}
                    </Text>
                    {mercado.empresaId === mercadoAtual && (
                      <Text style={styles.mercadoDica}>você está aqui</Text>
                    )}
                    {ehMenor && (
                      <Text style={styles.menor}>
                        {usarUnitario ? `menor por ${u?.sigla ?? ''}` : 'menor preço'}
                      </Text>
                    )}
                    {referencia?.data && (
                      <Text style={styles.ultimo} numberOfLines={1}>
                        {`último: ${toCurrency(referencia.preco)} em ${formatarData(referencia.data)}`}
                      </Text>
                    )}
                  </View>
                  <View style={styles.colunaCampo}>
                    <BrazilianIntegerInput
                      value={precos[mercado.empresaId] ?? ''}
                      onChangeValue={(texto): void =>
                        setPrecos((atuais) => ({ ...atuais, [mercado.empresaId]: texto }))
                      }
                      decimalScale={2}
                      placeholder={dica !== null ? `últ. ${formatarMoeda(dica)}` : '0,00'}
                      accessibilityLabel={`Preço em ${mercado.nome}`}
                      style={[styles.campo, ehMenor && styles.campoMenor]}
                    />
                    {unitario && (
                      <Text style={styles.unitario}>
                        {toCurrencyPorUnidade(unitario.valor, unitario.sigla)}
                      </Text>
                    )}
                  </View>
                </View>

                {variantesDoProduto.length > 1 && valor > 0 && (
                  <ChipSelector
                    scroll
                    opcoes={[
                      { valor: SEM_MARCA, rotulo: varianteId ? 'Mesma do item' : 'Não informada' },
                      ...variantesDoProduto.map((atual) => ({
                        valor: atual.id,
                        rotulo: rotuloVariante(atual, marcas),
                      })),
                    ]}
                    selecionado={marca ?? SEM_MARCA}
                    onSelecionar={(escolhida): void =>
                      setMarcasPorMercado((atuais) => ({
                        ...atuais,
                        [mercado.empresaId]: escolhida === SEM_MARCA ? null : escolhida,
                      }))
                    }
                  />
                )}
              </View>
            );
          })
        )}
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  blocoMercado: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  linhaPreco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dicaMarca: {
    marginBottom: spacing.sm,
  },
  comparar: {
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  referencias: {
    gap: spacing.xs,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  referenciaTexto: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  ultimo: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  colunaCampo: {
    alignItems: 'flex-end',
    gap: 2,
  },
  unitario: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  mercado: {
    flex: 1,
    gap: 2,
  },
  mercadoNome: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  mercadoDica: {
    fontSize: fontSize.micro,
    color: colors.primary,
  },
  menor: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  campo: {
    width: 120,
    textAlign: 'right',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceMuted,
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  campoMenor: {
    borderColor: colors.success,
    backgroundColor: colors.successSoft,
  },
}));
