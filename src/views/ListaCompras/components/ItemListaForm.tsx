import Ionicons from '@expo/vector-icons/Ionicons';
import { useMemo, useState } from 'react';
import { Pressable, View } from 'react-native';
import { v4 as uuidv4 } from 'uuid';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { BottomSheet, Button, ChipSelector, Text, TextInput } from '../../../components/ui';
import type { HistoricoPreco } from '../../../models/historicoPreco';
import type { CotacaoNaLista, ItemListaCompras } from '../../../models/listaCompras';
import type { Marca } from '../../../models/marcas';
import type { Produto } from '../../../models/produtos';
import type { ProdutoVariantes } from '../../../models/produtoVariantes';
import { fontSize, fontWeight, makeStyles, radius, spacing, useTheme } from '../../../theme';
import type { PrecoEncontrado } from '../../../utils/comparativoMercados';
import {
  type ComparacaoCotacoes,
  compararCotacoes,
  empataComAMelhor,
  percentualAcimaDaMelhor,
} from '../../../utils/cotacoesLista';
import {
  formatarData,
  formatarMoeda,
  toCurrency,
  toCurrencyPorUnidade,
  toPercent,
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

/** Cotacao sem a marca vista. */
const SEM_MARCA = '__sem_marca__';

type MercadoDoForm = {
  empresaId: string;
  nome: string;
};

/** Uma cotacao no painel: a variante cotada e o texto do campo de preco. */
type LinhaCotacao = {
  id: string;
  empresaId: string;
  varianteId: string | null;
  /** Texto do campo (`''` = vazio). */
  preco: string;
};

/** Linha com preco, pronta para comparar. */
type LinhaComPreco = {
  linha: LinhaCotacao;
  varianteId: string | null;
  preco: number;
  unitario: PrecoPorUnidade | null;
};

type ItemListaFormProps = {
  visivel: boolean;
  /** Item em edicao; `null` cria um novo. */
  item: ItemListaCompras | null;
  produtos: Produto[];
  variantes: ProdutoVariantes[];
  marcas: Marca[];
  /** Mercados comparados, na ordem da lista; cada um ganha suas cotacoes. */
  mercados: MercadoDoForm[];
  mercadoAtual: string | null;
  /** Cotacoes do item como estao na lista, em todos os mercados. */
  cotacoes: CotacaoNaLista[];
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
  onFechar: () => void;
  /** Devolve `true` quando gravou, o que fecha o painel. */
  onSalvar: (dados: DadosItemLista, editando: ItemListaCompras | null) => boolean;
};

/**
 * Painel de item da lista: produto cadastrado ou texto livre, a quantidade e
 * as cotacoes de cada mercado comparado. Num produto com varias marcas, cada
 * mercado aceita uma cotacao por marca/embalagem, comparadas pelo preco por
 * kg/L/un; o circulo escolhe qual levar.
 */
export default function ItemListaForm({
  visivel,
  item,
  produtos,
  variantes,
  marcas,
  mercados,
  mercadoAtual,
  cotacoes,
  marcaInicial,
  referenciaNoMercado,
  menorPrecoVisto,
  precoBase,
  unitarioDe,
  nomeEmpresa,
  onFechar,
  onSalvar,
}: ItemListaFormProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const [produtoId, setProdutoId] = useState<string | null>(item?.produto_id ?? null);
  const [varianteId, setVarianteId] = useState<string | null>(item?.variante_id ?? null);
  const [descricao, setDescricao] = useState(item?.descricao ?? '');
  const [quantidade, setQuantidade] = useState(item ? String(item.quantidade) : '1');
  const [inicio] = useState(() => {
    const doProduto = variantes.filter((atual) => atual.produto_id === item?.produto_id);
    const unica = item?.produto_id && doProduto.length === 1 ? doProduto[0].id : null;

    return linhasIniciais(cotacoes, mercados, item, marcaInicial, unica);
  });
  const [linhas, setLinhas] = useState<LinhaCotacao[]>(inicio.linhas);
  /** Linha cuja marca esta sendo trocada. */
  const [trocandoMarca, setTrocandoMarca] = useState<string | null>(null);
  /** Mercado em que a escolha de outra marca/embalagem esta aberta. */
  const [adicionandoEm, setAdicionandoEm] = useState<string | null>(null);
  /** Linha recem-criada (ou a da marca lida): o campo de preco dela abre com o teclado. */
  const [focar, setFocar] = useState<string | null>(inicio.focar);

  const variantesDoProduto = useMemo(
    () => (produtoId ? variantes.filter((variante) => variante.produto_id === produtoId) : []),
    [variantes, produtoId],
  );

  const variante = variantes.find((atual) => atual.id === varianteId);
  const granel = ehGranel(variante);
  const medida = variante && granel ? medidaGranel(variante) : '';
  /** Produto com mais de uma variante: cada mercado compara marcas/embalagens. */
  const comparaMarcas = variantesDoProduto.length > 1;

  /** Variante do item, ou a unica do produto quando ele so tem uma. */
  const varianteDoItem =
    varianteId ?? (variantesDoProduto.length === 1 ? variantesDoProduto[0].id : null);

  const menorVisto = varianteDoItem ? menorPrecoVisto(varianteDoItem) : null;
  const cadastrado = varianteDoItem ? precoBase(varianteDoItem) : null;

  const rotuloDe = (id: string | null): string => {
    const encontrada = id ? variantes.find((atual) => atual.id === id) : undefined;
    return encontrada ? rotuloVariante(encontrada, marcas) : 'Marca não informada';
  };

  /** Variante que vale para a linha: a cotada ou a unica do produto. */
  const varianteDaLinha = (linha: LinhaCotacao): string | null =>
    produtoId
      ? (linha.varianteId ?? (variantesDoProduto.length === 1 ? variantesDoProduto[0].id : null))
      : null;

  const comPreco = (doMercado: LinhaCotacao[]): LinhaComPreco[] =>
    doMercado.flatMap((linha) => {
      const valor = Number(linha.preco);

      if (!(valor > 0)) {
        return [];
      }

      const daLinha = varianteDaLinha(linha);
      return [{ linha, varianteId: daLinha, preco: valor, unitario: unitarioDe(valor, daLinha) }];
    });

  /** O mercado atual primeiro: e nele que o usuario esta anotando. */
  const mercadosEmOrdem = [
    ...mercados.filter((mercado) => mercado.empresaId === mercadoAtual),
    ...mercados.filter((mercado) => mercado.empresaId !== mercadoAtual),
  ];

  const porMercado = new Map(
    mercados.map((mercado) => {
      const doMercado = linhas.filter((linha) => linha.empresaId === mercado.empresaId);
      const cotadas = comPreco(doMercado);

      return [
        mercado.empresaId,
        { doMercado, cotadas, comparacao: compararCotacoes(cotadas, varianteId) },
      ];
    }),
  );

  /** A cotacao que vale em cada mercado, comparada entre os mercados. */
  const vales = [...porMercado.values()].flatMap(({ comparacao }) =>
    comparacao.vale ? [comparacao.vale] : [],
  );
  const entreMercados = compararCotacoes(vales, null);

  const menorEntreMercados = (empresaId: string): boolean => {
    const vale = porMercado.get(empresaId)?.comparacao.vale;
    return vales.length > 1 && vale !== null && vale !== undefined
      ? empataComAMelhor(vale, entreMercados)
      : false;
  };

  const rotuloMenor = (comparacao: ComparacaoCotacoes<LinhaComPreco>): string => {
    const sigla = comparacao.melhor?.unitario?.sigla;
    return comparacao.porUnidade && sigla ? `menor por ${sigla}` : 'menor preço';
  };

  // --- Edicao ------------------------------------------------------------------------

  const selecionarProduto = (id: string): void => {
    const novo = produtoId === id ? null : id;

    setProdutoId(novo);
    setVarianteId(null);
    setTrocandoMarca(null);
    setAdicionandoEm(null);
    // As marcas cotadas eram do produto anterior: fica um preco por mercado, sem marca.
    setLinhas((atuais) =>
      mercados.flatMap((mercado) => {
        const primeira = atuais.find((linha) => linha.empresaId === mercado.empresaId);
        return primeira ? [{ ...primeira, varianteId: null }] : [];
      }),
    );

    if (novo) {
      setDescricao(produtos.find((produto) => produto.id === novo)?.nome ?? '');
    }
  };

  const selecionarVariante = (id: string): void => {
    const nova = id === QUALQUER ? undefined : variantes.find((atual) => atual.id === id);
    const novoId = nova?.id ?? null;

    // Trocar entre pacote e granel muda o sentido da quantidade.
    if (ehGranel(nova) !== granel) {
      setQuantidade(ehGranel(nova) ? '' : '1');
    }

    // Campo ainda vazio com a marca antiga do item acompanha a nova escolha,
    // se ela nao estiver cotada no mesmo mercado.
    setLinhas((atuais) =>
      atuais.map((linha) =>
        linha.preco === '' &&
        linha.varianteId === varianteId &&
        !atuais.some((outra) => outra.empresaId === linha.empresaId && outra.varianteId === novoId)
          ? { ...linha, varianteId: novoId }
          : linha,
      ),
    );
    setVarianteId(novoId);
  };

  /** O circulo da cotacao: fixa a marca dela no item ou, se ja era ela, volta a "qualquer". */
  const levar = (cotada: LinhaComPreco): void => {
    if (cotada.varianteId) {
      selecionarVariante(cotada.varianteId === varianteId ? QUALQUER : cotada.varianteId);
    }
  };

  const mudarLinha = (id: string, mudanca: Partial<LinhaCotacao>): void =>
    setLinhas((atuais) =>
      atuais.map((linha) => (linha.id === id ? { ...linha, ...mudanca } : linha)),
    );

  const adicionarLinha = (empresaId: string, novaVariante: string): void => {
    const id = uuidv4();

    setLinhas((atuais) => [...atuais, { id, empresaId, varianteId: novaVariante, preco: '' }]);
    setFocar(id);
    setAdicionandoEm(null);
  };

  const removerLinha = (id: string): void => {
    setLinhas((atuais) => atuais.filter((linha) => linha.id !== id));

    if (trocandoMarca === id) {
      setTrocandoMarca(null);
    }
  };

  const salvar = (): void => {
    const salvou = onSalvar(
      {
        produtoId,
        varianteId,
        descricao,
        quantidade: Number(quantidade),
        cotacoes: linhas.map((linha) => {
          const valor = Number(linha.preco);

          return {
            id: linha.id,
            empresaId: linha.empresaId,
            varianteId: varianteDaLinha(linha),
            preco: valor > 0 ? valor : null,
          };
        }),
      },
      item,
    );

    if (salvou) {
      onFechar();
    }
  };

  // --- Partes do painel ----------------------------------------------------------------

  const campoDePreco = (
    linha: LinhaCotacao,
    rotulo: string,
    destaque: boolean,
    unitario: PrecoPorUnidade | null,
    dica: number | null,
  ): React.ReactNode => (
    <View style={styles.colunaCampo}>
      <BrazilianIntegerInput
        value={linha.preco}
        onChangeValue={(texto): void => mudarLinha(linha.id, { preco: texto })}
        decimalScale={2}
        autoFocus={linha.id === focar}
        placeholder={dica !== null ? `últ. ${formatarMoeda(dica)}` : '0,00'}
        accessibilityLabel={`Preço de ${rotulo}`}
        style={[styles.campo, destaque && styles.campoMenor]}
      />
      {unitario && (
        <Text style={[styles.unitario, destaque && styles.unitarioMenor]}>
          {toCurrencyPorUnidade(unitario.valor, unitario.sigla)}
        </Text>
      )}
    </View>
  );

  /** Produto sem marcas para comparar (ou texto livre): um preco por mercado. */
  const mercadoSimples = (mercado: MercadoDoForm): React.ReactNode => {
    const dados = porMercado.get(mercado.empresaId);

    return (
      <View key={mercado.empresaId} style={styles.blocoMercado}>
        {(dados?.doMercado ?? []).map((linha) => linhaSimples(mercado, linha))}
      </View>
    );
  };

  const linhaSimples = (mercado: MercadoDoForm, linha: LinhaCotacao): React.ReactNode => {
    const valor = Number(linha.preco);
    const daLinha = varianteDaLinha(linha);
    const referencia = referenciaNoMercado(
      { produto_id: produtoId, variante_id: daLinha ?? varianteId },
      mercado.empresaId,
    );
    const ehMenor = valor > 0 && menorEntreMercados(mercado.empresaId);

    return (
      <View key={linha.id} style={styles.linhaPreco}>
        <View style={styles.info}>
          <Text style={styles.mercadoNome} numberOfLines={1}>
            {mercado.nome}
          </Text>
          {mercado.empresaId === mercadoAtual && (
            <Text style={styles.mercadoDica}>você está aqui</Text>
          )}
          {ehMenor && <Text style={styles.menor}>{rotuloMenor(entreMercados)}</Text>}
          {referencia?.data && (
            <Text style={styles.ultimo} numberOfLines={1}>
              {`último: ${toCurrency(referencia.preco)} em ${formatarData(referencia.data)}`}
            </Text>
          )}
        </View>
        {campoDePreco(
          linha,
          mercado.nome,
          ehMenor,
          unitarioDe(valor > 0 ? valor : null, daLinha),
          referencia?.preco ?? null,
        )}
      </View>
    );
  };

  /** Produto com varias marcas: uma cotacao por marca/embalagem vista no mercado. */
  const mercadoComMarcas = (mercado: MercadoDoForm): React.ReactNode => {
    const dados = porMercado.get(mercado.empresaId);

    if (!dados) {
      return null;
    }

    const { doMercado, cotadas, comparacao } = dados;
    const comparando = cotadas.length > 1;
    const usadas = new Set(doMercado.map((linha) => linha.varianteId));
    const livres = variantesDoProduto.filter((atual) => !usadas.has(atual.id));
    const escolhaCotada = varianteId !== null && cotadas.some((c) => c.varianteId === varianteId);
    const siglaMelhor = comparacao.porUnidade ? comparacao.melhor?.unitario?.sigla : undefined;

    const dicaLevar = !comparando
      ? null
      : escolhaCotada
        ? 'Levando a sua escolha. Toque no círculo dela para voltar à mais barata.'
        : varianteId !== null
          ? `Sem cotação de ${rotuloDe(varianteId)} aqui: levando a mais barata.`
          : `Levando a mais barata${siglaMelhor ? ` por ${siglaMelhor}` : ''}. Toque no círculo para fixar outra.`;

    return (
      <View key={mercado.empresaId} style={styles.blocoMercado}>
        <View style={styles.cabecalhoMercado}>
          <Text style={styles.mercadoNome} numberOfLines={1}>
            {mercado.nome}
          </Text>
          {mercado.empresaId === mercadoAtual && (
            <Text style={styles.mercadoDica}>você está aqui</Text>
          )}
          {menorEntreMercados(mercado.empresaId) && (
            <Text style={styles.menor}>{`${rotuloMenor(entreMercados)} entre os mercados`}</Text>
          )}
        </View>

        {doMercado.map((linha) => {
          const cotada = cotadas.find((atual) => atual.linha.id === linha.id);
          const daLinha = varianteDaLinha(linha);
          const rotulo = rotuloDe(daLinha);
          const vale = comparando && cotada !== undefined && comparacao.vale === cotada;
          const melhor = comparando && cotada !== undefined && empataComAMelhor(cotada, comparacao);
          const acima = comparando && cotada ? percentualAcimaDaMelhor(cotada, comparacao) : null;
          const referencia = referenciaNoMercado(
            { produto_id: produtoId, variante_id: daLinha ?? varianteId },
            mercado.empresaId,
          );
          const opcoesMarca = [
            { valor: SEM_MARCA, rotulo: 'Não informada' },
            ...variantesDoProduto
              .filter((atual) => atual.id === linha.varianteId || !usadas.has(atual.id))
              .map((atual) => ({ valor: atual.id, rotulo: rotuloVariante(atual, marcas) })),
          ];

          return (
            <View key={linha.id} style={styles.cotacao}>
              <View style={styles.linhaPreco}>
                {comparando && (
                  <Pressable
                    onPress={(): void => {
                      if (cotada) {
                        levar(cotada);
                      }
                    }}
                    disabled={!cotada || !daLinha}
                    hitSlop={spacing.sm}
                    style={[styles.radio, vale && styles.radioMarcado]}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: vale, disabled: !cotada || !daLinha }}
                    accessibilityLabel={`Levar ${rotulo}`}
                  >
                    {vale && <View style={styles.radioPonto} />}
                  </Pressable>
                )}

                <View style={styles.info}>
                  <Pressable
                    onPress={(): void =>
                      setTrocandoMarca((atual) => (atual === linha.id ? null : linha.id))
                    }
                    hitSlop={spacing.xs}
                    accessibilityRole="button"
                    accessibilityLabel={`Trocar a marca: ${rotulo}`}
                    style={styles.marcaLinha}
                  >
                    <Text
                      style={daLinha ? styles.variante : styles.varianteVazia}
                      numberOfLines={1}
                    >
                      {rotulo}
                    </Text>
                    <Ionicons
                      name={trocandoMarca === linha.id ? 'chevron-up' : 'chevron-down'}
                      size={14}
                      color={colors.textSubtle}
                    />
                  </Pressable>
                  {melhor ? (
                    <Text style={styles.menor}>
                      {comparacao.porUnidade && siglaMelhor
                        ? `mais barato por ${siglaMelhor}`
                        : 'menor preço'}
                    </Text>
                  ) : acima !== null ? (
                    <Text
                      style={styles.acima}
                    >{`${toPercent(acima)} por ${siglaMelhor ?? 'un'}`}</Text>
                  ) : referencia?.data ? (
                    <Text style={styles.ultimo} numberOfLines={1}>
                      {`último: ${toCurrency(referencia.preco)} em ${formatarData(referencia.data)}`}
                    </Text>
                  ) : null}
                </View>

                {campoDePreco(
                  linha,
                  `${rotulo} em ${mercado.nome}`,
                  melhor,
                  cotada?.unitario ?? null,
                  referencia?.preco ?? null,
                )}

                {doMercado.length > 1 && (
                  <Pressable
                    onPress={(): void => removerLinha(linha.id)}
                    hitSlop={spacing.sm}
                    accessibilityRole="button"
                    accessibilityLabel={`Tirar ${rotulo} de ${mercado.nome}`}
                  >
                    <Ionicons name="close" size={18} color={colors.textSubtle} />
                  </Pressable>
                )}
              </View>

              {trocandoMarca === linha.id && (
                <ChipSelector
                  scroll
                  opcoes={opcoesMarca}
                  selecionado={linha.varianteId ?? SEM_MARCA}
                  onSelecionar={(escolhida): void => {
                    mudarLinha(linha.id, {
                      varianteId: escolhida === SEM_MARCA ? null : escolhida,
                    });
                    setTrocandoMarca(null);
                  }}
                />
              )}
            </View>
          );
        })}

        {livres.length > 0 && (
          <>
            <Button
              label={adicionandoEm === mercado.empresaId ? 'Fechar' : 'Outra marca/embalagem'}
              icon={adicionandoEm === mercado.empresaId ? 'close' : 'add'}
              variant="ghost"
              size="sm"
              style={styles.adicionar}
              onPress={(): void =>
                setAdicionandoEm((atual) =>
                  atual === mercado.empresaId ? null : mercado.empresaId,
                )
              }
            />
            {adicionandoEm === mercado.empresaId && (
              <ChipSelector
                scroll
                opcoes={livres.map((atual) => ({
                  valor: atual.id,
                  rotulo: rotuloVariante(atual, marcas),
                }))}
                selecionado={null}
                onSelecionar={(escolhida): void => adicionarLinha(mercado.empresaId, escolhida)}
              />
            )}
          </>
        )}

        {dicaLevar && <Text style={styles.dicaLevar}>{dicaLevar}</Text>}
      </View>
    );
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
            onPress={salvar}
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
            <Text style={sharedStyles.label}>Marca / embalagem que vai levar</Text>
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
            {comparaMarcas && (
              <Text style={[sharedStyles.sectionHint, styles.dicaQualquer]}>
                Com &quot;Qualquer&quot;, vale a mais barata por kg/L/un de cada mercado.
              </Text>
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

        {comparaMarcas && mercados.length > 0 && (
          <Text style={[sharedStyles.sectionHint, styles.dicaMarcas]}>
            Anote cada marca/embalagem que encontrar: a comparação usa o preço por kg/L/un.
          </Text>
        )}

        {mercados.length === 0 ? (
          <Text style={sharedStyles.inlineEmptyText}>
            Escolha os mercados no card &quot;Mercados&quot; da lista para anotar os preços.
          </Text>
        ) : (
          mercadosEmOrdem.map((mercado) =>
            comparaMarcas ? mercadoComMarcas(mercado) : mercadoSimples(mercado),
          )
        )}
      </View>
    </BottomSheet>
  );
}

/**
 * As cotacoes do item em cada mercado comparado, mais um campo vazio em cada
 * mercado sem nenhuma. A marca lida pelo codigo de barras ganha o seu campo no
 * mercado em que foi lida - e o foco, se ainda estiver sem preco.
 */
const linhasIniciais = (
  cotacoes: CotacaoNaLista[],
  mercados: MercadoDoForm[],
  item: ItemListaCompras | null,
  marcaInicial: { empresaId: string; varianteId: string } | null | undefined,
  /** A variante do produto do item, quando ele so tem uma: e a marca de toda cotacao sem marca. */
  unicaVariante: string | null,
): { linhas: LinhaCotacao[]; focar: string | null } => {
  const comparados = new Set(mercados.map((mercado) => mercado.empresaId));
  const linhas: LinhaCotacao[] = cotacoes
    .filter((cotacao) => comparados.has(cotacao.empresa_id))
    .map((cotacao) => ({
      id: cotacao.id,
      empresaId: cotacao.empresa_id,
      varianteId: cotacao.variante_id,
      preco: cotacao.preco.toFixed(2),
    }));

  const lida =
    marcaInicial && comparados.has(marcaInicial.empresaId)
      ? (linhas.find(
          (linha) =>
            linha.empresaId === marcaInicial.empresaId &&
            (linha.varianteId ?? unicaVariante) === marcaInicial.varianteId,
        ) ?? {
          id: uuidv4(),
          empresaId: marcaInicial.empresaId,
          varianteId: marcaInicial.varianteId,
          preco: '',
        })
      : null;

  if (lida && !linhas.includes(lida)) {
    linhas.push(lida);
  }

  for (const mercado of mercados) {
    if (!linhas.some((linha) => linha.empresaId === mercado.empresaId)) {
      linhas.push({
        id: uuidv4(),
        empresaId: mercado.empresaId,
        varianteId: item?.variante_id ?? null,
        preco: '',
      });
    }
  }

  return { linhas, focar: lida && lida.preco === '' ? lida.id : null };
};

const useStyles = makeStyles((colors) => ({
  blocoMercado: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  cabecalhoMercado: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'baseline',
    columnGap: spacing.sm,
  },
  cotacao: {
    gap: spacing.xs,
  },
  linhaPreco: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  dicaQualquer: {
    marginTop: spacing.xs,
  },
  dicaMarcas: {
    marginBottom: spacing.sm,
  },
  dicaLevar: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  adicionar: {
    alignSelf: 'flex-start',
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
  unitarioMenor: {
    color: colors.success,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  mercadoNome: {
    flexShrink: 1,
    fontSize: fontSize.input,
    fontWeight: fontWeight.medium,
    color: colors.textStrong,
  },
  mercadoDica: {
    fontSize: fontSize.micro,
    color: colors.primary,
  },
  marcaLinha: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  variante: {
    flexShrink: 1,
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  varianteVazia: {
    flexShrink: 1,
    fontSize: fontSize.body,
    color: colors.textSubtle,
  },
  menor: {
    fontSize: fontSize.micro,
    fontWeight: fontWeight.bold,
    color: colors.success,
  },
  acima: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioMarcado: {
    borderColor: colors.success,
  },
  radioPonto: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.success,
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
