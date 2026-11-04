import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../components/ui';
import {
  type CategoriaLancamento,
  listCategoriasLancamento,
} from '../../models/categoriasLancamento';
import { emTransacao } from '../../models/database';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { type HistoricoPreco, listHistoricoPreco } from '../../models/historicoPreco';
import { registrarLancamento } from '../../models/lancamentos';
import {
  adicionarMercadoNaLista,
  type CompraDeProduto,
  deleteItemListaCompras,
  deleteItensComprados,
  deleteTodosItensListaCompras,
  deleteTodosPrecosDaLista,
  getMercadoAtualDaLista,
  insertItensListaCompras,
  type ItemListaCompras,
  listComprasDeProdutos,
  listItensListaCompras,
  listMercadosDaLista,
  listPrecosDaLista,
  type PrecoNaLista,
  removerMercadoDaLista,
  salvarPrecoDaLista,
  saveMercadoAtualDaLista,
  updateItemListaCompras,
} from '../../models/listaCompras';
import { listMarcas, type Marca } from '../../models/marcas';
import { listProdutos, type Produto } from '../../models/produtos';
import {
  listProdutoVariantes,
  type ProdutoVariantes,
  registrarPrecoVariante,
} from '../../models/produtoVariantes';
import { getLocalPadrao } from '../../models/settingsModel';
import { normalizarTexto } from '../../utils/busca';
import { compararLista, type ResumoMercadoLista } from '../../utils/comparativoLista';
import { precoDoItem, type PrecoEncontrado } from '../../utils/comparativoMercados';
import { agruparVariantesPorProduto } from '../../utils/comparativoVariantes';
import { vibrarSelecao, vibrarSucesso } from '../../utils/haptics';
import { Locais } from '../../utils/local';
import {
  selecionarPrecosParaHistorico,
  varianteParaHistorico,
} from '../../utils/precosParaHistorico';
import { sugerirCompras, type SugestaoCompra } from '../../utils/sugestoesCompra';
import {
  ehGranel,
  medidaGranel,
  type PrecoPorUnidade,
  precoPorUnidadePrimaria,
  rotuloQuantidade as rotuloQuantidadeDaVariante,
  rotuloVariante as rotuloDaVariante,
} from '../../utils/variantes';
import type { NovoLancamento, RascunhoLancamento } from '../Home/types';
import type { ComparativoProduto, ItemOrcamento } from '../Orcamento/types';

/** Categoria sugerida para a compra (criada pela migracao 008). */
const CATEGORIA_MERCADO = 'mercado';

/** Espera depois da ultima tecla antes de gravar os precos digitados. */
const ESPERA_GRAVAR_PRECO = 600;

/** Preco de um item num dos mercados comparados. */
export type PrecoNoMercado = {
  empresaId: string;
  nome: string;
  preco: number | null;
  /** Variante anotada com o preco naquele mercado (opcional). */
  varianteId: string | null;
  /** Menor preco do item entre os mercados (so com 2 cotacoes ou mais). */
  menor: boolean;
};

/** Um item da lista com os precos dele em cada mercado. */
export type ItemNaLista = {
  item: ItemListaCompras;
  /** `Marca • 500 g` da variante escolhida; `null` quando serve qualquer uma. */
  variante: string | null;
  /** Quantidade pronta para exibir (`2` ou `0,75 kg`). */
  quantidade: string;
  /** Variante vendida por peso/volume: a quantidade e a medida, nao unidades. */
  granel: boolean;
  /** Medida do preco a granel (`kg`, `100 g`); vazio nos pacotes. */
  medida: string;
  /** Na ordem dos mercados comparados. */
  precos: PrecoNoMercado[];
  /** Preco anotado no mercado em que o usuario esta. */
  precoAtual: number | null;
  /** Ultimo preco do historico no mercado atual, sugerido no campo vazio. */
  dicaAtual: number | null;
  /** Rotulo da variante anotada com o preco no mercado atual. */
  marcaAtual: string | null;
  /** Preco aqui reduzido a unidade primaria da variante (R$/kg, R$/L, R$/un). */
  unitarioAtual: PrecoPorUnidade | null;
  /**
   * O preco aqui pode ganhar uma marca: o produto tem mais de uma variante e o
   * item nao fixou nenhuma. Sem ela o preco fica fora do historico.
   */
  escolheMarca: boolean;
  /**
   * Preco aqui menos o menor dos outros mercados: negativo ou zero = aqui e o
   * mais barato. `null` sem preco aqui ou sem preco em outro lugar.
   */
  diferencaAtual: number | null;
};

export type MercadoNaLista = ResumoMercadoLista & {
  nome: string;
  /** Mercado em que o usuario esta agora. */
  atual: boolean;
};

export type ResumoComparacao = {
  itensEmComum: number;
  vantagem: { mercado: string; sobre: string; valor: number } | null;
  dividindo: { total: number; economia: number; mercados: number } | null;
};

export type TotaisLista = {
  itens: number;
  pendentes: number;
  comprados: number;
  /** Soma da lista no mercado atual, so com o que tem preco la. */
  noMercadoAtual: number;
  itensComPrecoAtual: number;
  noCarrinho: number;
  /** Itens no carrinho ainda sem preco no mercado atual. */
  carrinhoSemPreco: number;
};

export type SugestaoNaLista = SugestaoCompra & { nome: string };

/** Campos do formulario de item. */
export type DadosItemLista = {
  produtoId: string | null;
  varianteId: string | null;
  descricao: string;
  quantidade: number;
  /** Preco (e a variante vista) em cada mercado comparado; preco `null` apaga. */
  precos: Record<string, { preco: number | null; varianteId: string | null }>;
};

export type UseListaCompras = {
  loading: boolean;
  atualizando: boolean;
  atualizar: () => void;

  pendentes: ItemNaLista[];
  comprados: ItemNaLista[];
  totais: TotaisLista;

  mercados: MercadoNaLista[];
  comparacao: ResumoComparacao;
  mercadoAtual: string | null;
  nomeMercadoAtual: string | null;
  /** Marca onde o usuario esta (tocar de novo desmarca); entra na comparacao se faltar. */
  escolherMercadoAtual: (empresaId: string) => void;
  /** Poe ou tira o mercado da comparacao. */
  alternarMercado: (empresaId: string) => void;
  nomeEmpresa: (id: string | null) => string;

  sugestoes: SugestaoNaLista[];
  adicionarSugestoes: (sugestoes: SugestaoNaLista[]) => void;
  /** Adiciona um item pelo nome; usa o produto cadastrado quando o nome bate. */
  adicionarRapido: (texto: string, produtoId?: string) => void;

  produtos: Produto[];
  variantes: ProdutoVariantes[];
  marcas: Marca[];
  empresas: Empresa[];

  /** Anota o preco do item no mercado; `null` apaga. Grava logo depois de parar de digitar. */
  definirPreco: (itemId: string, empresaId: string, preco: number | null) => void;
  /** Preco anotado de um item num mercado. */
  precoAnotado: (itemId: string, empresaId: string) => number | null;
  /** Variante anotada com o preco do item no mercado. */
  varianteAnotada: (itemId: string, empresaId: string) => string | null;
  /** Marca/variante vista junto com o preco; `null` = nao informada. */
  definirVariantePreco: (itemId: string, empresaId: string, varianteId: string | null) => void;
  /** Ultimo preco do historico para o produto/variante no mercado, com a data. */
  referenciaNoMercado: (
    item: Pick<ItemListaCompras, 'produto_id' | 'variante_id'>,
    empresaId: string,
  ) => PrecoEncontrado | null;
  /** Menor preco ja registrado da variante, em qualquer mercado (como no orcamento). */
  menorPrecoVisto: (varianteId: string) => HistoricoPreco | null;
  /** Preco cadastrado na variante. */
  precoBase: (varianteId: string) => number | null;
  /** Preco reduzido a unidade primaria da variante; `null` sem medida cadastrada. */
  unitarioDe: (preco: number | null, varianteId: string | null) => PrecoPorUnidade | null;
  /**
   * Embalagens do mesmo produto no mercado atual, pelo preco por unidade - o
   * mesmo comparativo do orcamento.
   */
  comparativoVariantes: ComparativoProduto[];
  /** Poe na lista outra embalagem do produto do item, para comparar no mesmo mercado. */
  adicionarEmbalagem: (item: ItemListaCompras) => ItemListaCompras | null;

  /** Grava o item; `false` quando os dados nao passaram na validacao. */
  salvarItem: (dados: DadosItemLista, editando: ItemListaCompras | null) => boolean;
  alternarComprado: (entrada: ItemNaLista) => void;
  remover: (item: ItemListaCompras) => void;
  limparComprados: () => void;
  esvaziarLista: () => void;
  apagarPrecos: () => void;
  /** Grava no historico todos os precos anotados que ainda nao estao la. */
  registrarPrecosNoHistorico: () => void;
  /** Acha (ou poe na lista) o produto do codigo lido, para anotar o preco dele. */
  lerCodigo: (codigo: string) => { item: ItemListaCompras; varianteId: string } | null;
  /**
   * Valida o carrinho e monta o lancamento a conferir (`null` se faltar algo).
   * Ja leva ao historico os precos da pesquisa; os do carrinho no mercado da
   * compra vao com o proprio lancamento.
   */
  iniciarFechamento: () => RascunhoLancamento | null;
  /** Quantos precos da pesquisa o ultimo fechamento levou ao historico. */
  pesquisaSalva: number;
  /** Grava o lancamento e tira da lista o que foi comprado. */
  registrarCompra: (lancamento: NovoLancamento) => Promise<void>;
};

const chavePreco = (itemId: string, empresaId: string): string => `${itemId}|${empresaId}`;

/**
 * Lista de compras como pesquisa de precos: o mesmo item recebe o preco visto
 * em cada mercado, a tela compara lado a lado e, no mercado escolhido, os itens
 * vao para o carrinho e viram um lancamento com itens.
 */
export function useListaCompras(): UseListaCompras {
  const toast = useToast();
  const [itens, setItens] = useState<ItemListaCompras[]>([]);
  const [precos, setPrecos] = useState<PrecoNaLista[]>([]);
  const [mercados, setMercados] = useState<string[]>([]);
  const [mercadoAtual, setMercadoAtual] = useState<string | null>(null);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [categorias, setCategorias] = useState<CategoriaLancamento[]>([]);
  const [historico, setHistorico] = useState<HistoricoPreco[]>([]);
  const [compras, setCompras] = useState<CompraDeProduto[]>([]);
  const [localPadrao, setLocalPadrao] = useState(Locais.padrao);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [pesquisaSalva, setPesquisaSalva] = useState(0);

  /** Gravacoes em sequencia: dois toques rapidos nao gravam fora de ordem. */
  const fila = useRef(Promise.resolve());
  /** Precos digitados aguardando a pausa na digitacao para ir ao banco. */
  const precosPendentes = useRef(
    new Map<
      string,
      { itemId: string; empresaId: string; preco: number | null; varianteId: string | null }
    >(),
  );
  const timerPrecos = useRef<ReturnType<typeof setTimeout> | null>(null);

  const carregarDoBanco = useCallback(async (): Promise<void> => {
    const [
      itensDoBanco,
      precosDoBanco,
      mercadosDoBanco,
      mercadoAtualDoBanco,
      produtosDoBanco,
      variantesDoBanco,
      marcasDoBanco,
      empresasDoBanco,
      categoriasDoBanco,
      historicoDoBanco,
      comprasDoBanco,
      localDoBanco,
    ] = await Promise.all([
      listItensListaCompras(),
      listPrecosDaLista(),
      listMercadosDaLista(),
      getMercadoAtualDaLista(),
      listProdutos(),
      listProdutoVariantes(),
      listMarcas(),
      listEmpresas(),
      listCategoriasLancamento(),
      listHistoricoPreco(),
      listComprasDeProdutos(),
      getLocalPadrao(),
    ]);

    setItens(itensDoBanco);
    setPrecos(precosDoBanco);
    setMercados(mercadosDoBanco);
    // O mercado pode ter saido da comparacao ou sido excluido.
    setMercadoAtual(
      mercadoAtualDoBanco && mercadosDoBanco.includes(mercadoAtualDoBanco)
        ? mercadoAtualDoBanco
        : null,
    );
    setProdutos(produtosDoBanco);
    setVariantes(variantesDoBanco);
    setMarcas(marcasDoBanco);
    setEmpresas(empresasDoBanco);
    setCategorias(categoriasDoBanco);
    setHistorico(historicoDoBanco);
    setCompras(comprasDoBanco);
    setLocalPadrao(localDoBanco);
  }, []);

  const erroAoGravar = useCallback(
    async (error: unknown): Promise<void> => {
      console.error('Erro ao gravar a lista de compras:', error);
      Alert.alert('Erro', 'Não foi possível salvar a alteração na lista');
      await carregarDoBanco();
    },
    [carregarDoBanco],
  );

  /** Manda ao banco os precos digitados ate agora; resolve quando a fila esvaziar. */
  const gravarPrecosPendentes = useCallback((): Promise<void> => {
    if (timerPrecos.current) {
      clearTimeout(timerPrecos.current);
      timerPrecos.current = null;
    }

    const lote = [...precosPendentes.current.values()];
    precosPendentes.current.clear();

    if (lote.length > 0) {
      fila.current = fila.current
        .then(async () => {
          for (const pendente of lote) {
            await salvarPrecoDaLista(
              pendente.itemId,
              pendente.empresaId,
              pendente.preco,
              pendente.varianteId,
            );
          }
        })
        .catch(erroAoGravar);
    }

    return fila.current;
  }, [erroAoGravar]);

  /** Esquece precos ainda nao gravados de itens que vao sair da lista. */
  const descartarPendentes = (itemIds: Set<string>): void => {
    for (const [chave, pendente] of precosPendentes.current) {
      if (itemIds.has(pendente.itemId)) {
        precosPendentes.current.delete(chave);
      }
    }
  };

  const carregar = useCallback(async (): Promise<void> => {
    try {
      await gravarPrecosPendentes();
      await carregarDoBanco();
    } catch (error: unknown) {
      console.error('Erro ao carregar a lista de compras:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de compras');
    } finally {
      setLoading(false);
    }
  }, [gravarPrecosPendentes, carregarDoBanco]);

  useFocusEffect(
    useCallback(() => {
      void carregar();

      // Saindo da tela, o que foi digitado vai para o banco na hora.
      return (): void => {
        void gravarPrecosPendentes();
      };
    }, [carregar, gravarPrecosPendentes]),
  );

  useEffect(
    () => (): void => {
      void gravarPrecosPendentes();
    },
    [gravarPrecosPendentes],
  );

  const atualizar = useCallback((): void => {
    void (async (): Promise<void> => {
      setAtualizando(true);
      await carregar();
      setAtualizando(false);
    })();
  }, [carregar]);

  /**
   * Aplica a mudanca na tela na hora e grava em seguida; se a gravacao falhar,
   * a lista volta a refletir o banco.
   */
  const gravar = useCallback(
    (aplicar: () => void, acao: () => Promise<void>): void => {
      aplicar();
      fila.current = fila.current.then(acao).catch(erroAoGravar);
    },
    [erroAoGravar],
  );

  // --- Consultas -----------------------------------------------------------------

  const produtoPorId = useMemo(() => new Map(produtos.map((p) => [p.id, p])), [produtos]);
  const variantePorId = useMemo(() => new Map(variantes.map((v) => [v.id, v])), [variantes]);

  const variantesPorProduto = useMemo(() => {
    const porProduto = new Map<string, string[]>();

    for (const variante of variantes) {
      porProduto.set(variante.produto_id, [
        ...(porProduto.get(variante.produto_id) ?? []),
        variante.id,
      ]);
    }

    return porProduto;
  }, [variantes]);

  const nomeEmpresa = useCallback(
    (id: string | null): string =>
      empresas.find((empresa) => empresa.id === id)?.nome ?? 'Mercado removido',
    [empresas],
  );

  const precoPorChave = useMemo(
    () =>
      new Map(precos.map((preco) => [chavePreco(preco.item_id, preco.empresa_id), preco.preco])),
    [precos],
  );

  const precoAnotado = useCallback(
    (itemId: string, empresaId: string): number | null =>
      precoPorChave.get(chavePreco(itemId, empresaId)) ?? null,
    [precoPorChave],
  );

  /** Variante anotada com o preco; a que foi excluida do cadastro nao conta. */
  const varianteAnotada = useCallback(
    (itemId: string, empresaId: string): string | null => {
      const id = precos.find(
        (preco) => preco.item_id === itemId && preco.empresa_id === empresaId,
      )?.variante_id;

      return id && variantePorId.has(id) ? id : null;
    },
    [precos, variantePorId],
  );

  const historicoPorMercado = useMemo(() => {
    const porMercado = new Map<string, HistoricoPreco[]>();

    for (const registro of historico) {
      if (registro.empresa_id) {
        const lista = porMercado.get(registro.empresa_id) ?? [];
        lista.push(registro);
        porMercado.set(registro.empresa_id, lista);
      }
    }

    return porMercado;
  }, [historico]);

  const referenciaNoMercado = useCallback(
    (
      item: Pick<ItemListaCompras, 'produto_id' | 'variante_id'>,
      empresaId: string,
    ): PrecoEncontrado | null => {
      if (!item.produto_id && !item.variante_id) {
        return null;
      }

      return precoDoItem(
        { id: '', produtoId: item.produto_id, varianteId: item.variante_id, quantidade: 1 },
        historicoPorMercado.get(empresaId) ?? [],
      );
    },
    [historicoPorMercado],
  );

  const menorPrecoVisto = useCallback(
    (varianteId: string): HistoricoPreco | null => {
      const registros = historico.filter((registro) => registro.variante_id === varianteId);

      return registros.length === 0
        ? null
        : registros.reduce((menor, atual) => (atual.preco < menor.preco ? atual : menor));
    },
    [historico],
  );

  const precoBase = useCallback(
    (varianteId: string): number | null => {
      const preco = variantePorId.get(varianteId)?.preco ?? 0;
      return preco > 0 ? preco : null;
    },
    [variantePorId],
  );

  const unitarioDe = useCallback(
    (preco: number | null, varianteId: string | null): PrecoPorUnidade | null =>
      preco !== null && varianteId
        ? precoPorUnidadePrimaria(preco, variantePorId.get(varianteId))
        : null,
    [variantePorId],
  );

  /** Variante que vale para o preco: a anotada com ele, a do item ou a unica do produto. */
  const varianteQueVale = useCallback(
    (item: ItemListaCompras, empresaId: string): string | null =>
      varianteAnotada(item.id, empresaId) ?? varianteParaHistorico(item, variantesPorProduto),
    [varianteAnotada, variantesPorProduto],
  );

  // --- Comparacao ----------------------------------------------------------------

  const comparativo = useMemo(
    () =>
      compararLista(
        itens.map((item) => ({ id: item.id, quantidade: item.quantidade })),
        mercados,
        precos.map((preco) => {
          const varianteId = varianteAnotada(preco.item_id, preco.empresa_id);
          return {
            itemId: preco.item_id,
            empresaId: preco.empresa_id,
            preco: preco.preco,
            precoUnitario: unitarioDe(preco.preco, varianteId), // ← já calculado aqui
          };
        }),
      ),
    [itens, mercados, precos, varianteAnotada, unitarioDe],
  );

  const mercadosNaLista = useMemo(
    (): MercadoNaLista[] =>
      comparativo.mercados.map((mercado) => ({
        ...mercado,
        nome: nomeEmpresa(mercado.empresaId),
        atual: mercado.empresaId === mercadoAtual,
      })),
    [comparativo, nomeEmpresa, mercadoAtual],
  );

  const comparacao = useMemo(
    (): ResumoComparacao => ({
      itensEmComum: comparativo.itensEmComum,
      vantagem: comparativo.vantagem
        ? {
            mercado: nomeEmpresa(comparativo.vantagem.empresaId),
            sobre: nomeEmpresa(comparativo.vantagem.sobre),
            valor: comparativo.vantagem.valor,
          }
        : null,
      dividindo: comparativo.dividindo,
    }),
    [comparativo, nomeEmpresa],
  );

  // --- Itens na tela ---------------------------------------------------------------

  const naTela = useMemo(
    (): ItemNaLista[] =>
      itens.map((item) => {
        const variante = item.variante_id ? variantePorId.get(item.variante_id) : undefined;
        const menor = comparativo.menorPorItem.get(item.id);
        const precosDoItem = mercados.map((empresaId) => ({
          empresaId,
          nome: nomeEmpresa(empresaId),
          preco: precoAnotado(item.id, empresaId),
          varianteId: varianteAnotada(item.id, empresaId),
          menor: Boolean(menor && menor.cotacoes > 1 && menor.mercados.includes(empresaId)),
        }));

        const precoAtual = mercadoAtual ? precoAnotado(item.id, mercadoAtual) : null;
        const varianteDoPreco = mercadoAtual ? varianteAnotada(item.id, mercadoAtual) : null;
        const varianteAqui = mercadoAtual ? varianteQueVale(item, mercadoAtual) : null;
        const marca = varianteDoPreco ? variantePorId.get(varianteDoPreco) : undefined;
        const variantesDoProduto = item.produto_id
          ? (variantesPorProduto.get(item.produto_id)?.length ?? 0)
          : 0;
        const outros = precosDoItem
          .filter((preco) => preco.empresaId !== mercadoAtual && preco.preco !== null)
          .map((preco) => preco.preco as number);

        return {
          item,
          variante: variante ? rotuloDaVariante(variante, marcas) : null,
          quantidade: rotuloQuantidadeDaVariante(item.quantidade, variante),
          granel: ehGranel(variante),
          medida: variante && ehGranel(variante) ? medidaGranel(variante) : '',
          precos: precosDoItem,
          precoAtual,
          dicaAtual: mercadoAtual
            ? (referenciaNoMercado(
                { produto_id: item.produto_id, variante_id: varianteAqui ?? item.variante_id },
                mercadoAtual,
              )?.preco ?? null)
            : null,
          marcaAtual: marca ? rotuloDaVariante(marca, marcas) : null,
          unitarioAtual: unitarioDe(precoAtual, varianteAqui),
          escolheMarca: precoAtual !== null && !item.variante_id && variantesDoProduto > 1,
          diferencaAtual:
            precoAtual !== null && outros.length > 0 ? precoAtual - Math.min(...outros) : null,
        };
      }),
    [
      itens,
      variantePorId,
      comparativo,
      mercados,
      nomeEmpresa,
      precoAnotado,
      varianteAnotada,
      variantesPorProduto,
      mercadoAtual,
      marcas,
      referenciaNoMercado,
      varianteQueVale,
      unitarioDe,
    ],
  );

  /**
   * O mesmo comparativo do orcamento, no mercado em que o usuario esta: cada
   * item com preco aqui entra com a variante que vale para ele.
   */
  const comparativoVariantes = useMemo((): ComparativoProduto[] => {
    if (!mercadoAtual) {
      return [];
    }

    const entradas = naTela.flatMap(({ item, precoAtual }) => {
      const varianteId = varianteQueVale(item, mercadoAtual);

      if (!item.produto_id || precoAtual === null || !varianteId) {
        return [];
      }

      const comoNoOrcamento: ItemOrcamento = {
        localId: item.id,
        produtoId: item.produto_id,
        varianteId,
        descricao: item.descricao,
        quantidade: item.quantidade,
        preco: precoAtual,
      };

      return [{ item: comoNoOrcamento, unitario: unitarioDe(precoAtual, varianteId) }];
    });

    return agruparVariantesPorProduto(entradas, (item) => item.produtoId).map((grupo) => ({
      ...grupo,
      nomeProduto: produtoPorId.get(grupo.produtoId)?.nome ?? 'Produto removido',
    }));
  }, [mercadoAtual, naTela, varianteQueVale, unitarioDe, produtoPorId]);

  const pendentes = useMemo(() => naTela.filter((entrada) => !entrada.item.comprado), [naTela]);
  const comprados = useMemo(() => naTela.filter((entrada) => entrada.item.comprado), [naTela]);

  const totais = useMemo((): TotaisLista => {
    const atual = comparativo.mercados.find((mercado) => mercado.empresaId === mercadoAtual);

    return {
      itens: itens.length,
      pendentes: pendentes.length,
      comprados: comprados.length,
      noMercadoAtual: atual?.total ?? 0,
      itensComPrecoAtual: atual?.itensComPreco ?? 0,
      noCarrinho: comprados.reduce(
        (soma, entrada) => soma + (entrada.precoAtual ?? 0) * entrada.item.quantidade,
        0,
      ),
      carrinhoSemPreco: comprados.filter((entrada) => entrada.precoAtual === null).length,
    };
  }, [comparativo, mercadoAtual, itens, pendentes, comprados]);

  // --- Sugestoes -------------------------------------------------------------------

  const sugestoes = useMemo((): SugestaoNaLista[] => {
    const ignorar = new Set<string>();

    for (const item of itens) {
      if (item.produto_id) {
        ignorar.add(item.produto_id);
      }
    }

    for (const produto of produtos) {
      if (produto.eventual === 1) {
        ignorar.add(produto.id);
      }
    }

    return sugerirCompras(compras, dayjs().format('YYYY-MM-DD'), { ignorar })
      .filter((sugestao) => produtoPorId.has(sugestao.produtoId))
      .map((sugestao) => ({
        ...sugestao,
        nome: produtoPorId.get(sugestao.produtoId)?.nome ?? '',
        // A variante pode ter sido excluida depois da compra.
        varianteId:
          sugestao.varianteId && variantePorId.has(sugestao.varianteId)
            ? sugestao.varianteId
            : null,
      }));
  }, [itens, produtos, compras, produtoPorId, variantePorId]);

  // --- Inclusao ----------------------------------------------------------------------

  const novoItem = (
    dados: Pick<ItemListaCompras, 'produto_id' | 'variante_id' | 'descricao' | 'quantidade'>,
    ordem: number,
  ): ItemListaCompras => ({
    id: uuidv4(),
    comprado: 0,
    ...dados,
    ordem,
    created_at: new Date().toISOString(),
  });

  const proximaOrdem = (): number => Math.max(0, ...itens.map((item) => item.ordem)) + 1;

  const inserir = (novos: ItemListaCompras[], precosDosNovos: PrecoNaLista[] = []): void => {
    gravar(
      () => {
        setItens((atuais) => [...atuais, ...novos]);
        setPrecos((atuais) => [...atuais, ...precosDosNovos]);
      },
      async () => {
        await insertItensListaCompras(novos);

        for (const preco of precosDosNovos) {
          await salvarPrecoDaLista(preco.item_id, preco.empresa_id, preco.preco, preco.variante_id);
        }
      },
    );
  };

  const adicionarSugestoes = (lista: SugestaoNaLista[]): void => {
    const ordem = proximaOrdem();

    inserir(
      lista.map((sugestao, indice) =>
        novoItem(
          {
            produto_id: sugestao.produtoId,
            variante_id: sugestao.varianteId,
            descricao: sugestao.nome,
            quantidade: sugestao.quantidade,
          },
          ordem + indice,
        ),
      ),
    );
    vibrarSelecao();

    if (lista.length > 1) {
      toast.mostrar(`${lista.length} itens adicionados à lista`);
    }
  };

  const adicionarRapido = (texto: string, produtoId?: string): void => {
    const nome = texto.trim();
    const produto = produtoId
      ? produtoPorId.get(produtoId)
      : produtos.find((atual) => normalizarTexto(atual.nome) === normalizarTexto(nome));

    if (!produto && !nome) {
      return;
    }

    if (produto && itens.some((item) => item.produto_id === produto.id && !item.comprado)) {
      toast.mostrar(`${produto.nome} já está na lista`, { tipo: 'info' });
      return;
    }

    // Produto ja comprado antes: traz a variante e a quantidade de costume.
    const habito = produto
      ? sugerirCompras(
          compras.filter((compra) => compra.produto_id === produto.id),
          dayjs().format('YYYY-MM-DD'),
        )[0]
      : undefined;

    inserir([
      novoItem(
        {
          produto_id: produto?.id ?? null,
          variante_id:
            habito?.varianteId && variantePorId.has(habito.varianteId) ? habito.varianteId : null,
          descricao: produto?.nome ?? nome,
          quantidade: habito?.quantidade ?? 1,
        },
        proximaOrdem(),
      ),
    ]);
    vibrarSelecao();
  };

  const adicionarEmbalagem = (item: ItemListaCompras): ItemListaCompras | null => {
    const doProduto = item.produto_id ? (variantesPorProduto.get(item.produto_id) ?? []) : [];
    const atual = mercadoAtual ? varianteQueVale(item, mercadoAtual) : item.variante_id;
    // Comeca por uma variante que ainda nao esta na lista para este produto.
    const naLista = new Set(
      itens
        .filter((outro) => outro.produto_id === item.produto_id)
        .map((outro) => outro.variante_id),
    );
    const outra =
      doProduto.find((id) => id !== atual && !naLista.has(id)) ??
      doProduto.find((id) => id !== atual);

    if (!item.produto_id || !outra) {
      return null;
    }

    const nova = novoItem(
      {
        produto_id: item.produto_id,
        variante_id: outra,
        descricao: item.descricao,
        quantidade: 1,
      },
      proximaOrdem(),
    );

    inserir([nova]);
    return nova;
  };

  // --- Precos ----------------------------------------------------------------------

  /** Anota preco e variante do item no mercado; grava logo depois de parar de digitar. */
  const anotar = (
    itemId: string,
    empresaId: string,
    preco: number | null,
    varianteId: string | null,
  ): void => {
    const valor = preco !== null && preco > 0 ? preco : null;

    setPrecos((atuais) => {
      const sem = atuais.filter(
        (atual) => !(atual.item_id === itemId && atual.empresa_id === empresaId),
      );

      return valor === null
        ? sem
        : [
            ...sem,
            {
              item_id: itemId,
              empresa_id: empresaId,
              preco: valor,
              variante_id: varianteId,
              updated_at: new Date().toISOString(),
            },
          ];
    });

    precosPendentes.current.set(chavePreco(itemId, empresaId), {
      itemId,
      empresaId,
      preco: valor,
      varianteId,
    });

    if (timerPrecos.current) {
      clearTimeout(timerPrecos.current);
    }

    timerPrecos.current = setTimeout(() => {
      void gravarPrecosPendentes();
    }, ESPERA_GRAVAR_PRECO);
  };

  /** Digitar o preco mantem a marca que ja estava anotada com ele. */
  const definirPreco = (itemId: string, empresaId: string, preco: number | null): void =>
    anotar(itemId, empresaId, preco, varianteAnotada(itemId, empresaId));

  const definirVariantePreco = (
    itemId: string,
    empresaId: string,
    varianteId: string | null,
  ): void => {
    const preco = precoAnotado(itemId, empresaId);

    if (preco !== null) {
      vibrarSelecao();
      anotar(itemId, empresaId, preco, varianteId);
    }
  };

  const apagarPrecos = (): void => {
    if (precos.length === 0) {
      return;
    }

    Alert.alert(
      'Apagar preços',
      'Apagar todos os preços anotados? Os itens e os mercados continuam na lista.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Apagar',
          style: 'destructive',
          onPress: (): void => {
            precosPendentes.current.clear();
            gravar(
              () => setPrecos([]),
              () => deleteTodosPrecosDaLista(),
            );
          },
        },
      ],
    );
  };

  /**
   * Leva ao historico os precos anotados que ainda nao estao la (cada um com
   * a data em que foi anotado). Devolve quantos gravou e quantos itens ficaram
   * de fora por nao terem marca definida.
   */
  const salvarPesquisaNoHistorico = async (
    ignorar?: (itemId: string, empresaId: string) => boolean,
  ): Promise<{ salvos: number; semMarca: number }> => {
    await gravarPrecosPendentes();

    const { registros, semMarca } = selecionarPrecosParaHistorico(
      itens,
      precos.map((preco) => ({
        ...preco,
        variante_id: varianteAnotada(preco.item_id, preco.empresa_id),
      })),
      historico,
      variantesPorProduto,
      ignorar,
    );

    if (registros.length > 0) {
      await emTransacao(async () => {
        for (const registro of registros) {
          await registrarPrecoVariante({ ...registro, local: localPadrao });
        }
      });

      setHistorico(await listHistoricoPreco());
    }

    return { salvos: registros.length, semMarca };
  };

  const registrarPrecosNoHistorico = (): void => {
    void (async (): Promise<void> => {
      try {
        const { salvos, semMarca } = await salvarPesquisaNoHistorico();
        const avisoSemMarca =
          semMarca > 0
            ? ` ${semMarca} ${semMarca === 1 ? 'item sem marca escolhida ficou' : 'itens sem marca escolhida ficaram'} de fora.`
            : '';

        if (salvos === 0) {
          Alert.alert('Nada novo para salvar', `Os preços já estão no histórico.${avisoSemMarca}`);
          return;
        }

        toast.mostrar(
          `${salvos} ${salvos === 1 ? 'preço salvo' : 'preços salvos'} no histórico.${avisoSemMarca}`,
        );
      } catch (error: unknown) {
        console.error('Erro ao registrar os precos da lista no historico:', error);
        Alert.alert('Erro', 'Não foi possível salvar os preços no histórico');
      }
    })();
  };

  // --- Mercados --------------------------------------------------------------------

  const escolherMercadoAtual = (empresaId: string): void => {
    const novo = empresaId === mercadoAtual ? null : empresaId;

    setMercadoAtual(novo);
    vibrarSelecao();

    if (novo && !mercados.includes(novo)) {
      gravar(
        () => setMercados((atuais) => [...atuais, novo]),
        () => adicionarMercadoNaLista(novo),
      );
    }

    void saveMercadoAtualDaLista(novo).catch((error: unknown) =>
      console.error('Erro ao salvar o mercado atual da lista:', error),
    );
  };

  const alternarMercado = (empresaId: string): void => {
    if (!mercados.includes(empresaId)) {
      gravar(
        () => setMercados((atuais) => [...atuais, empresaId]),
        () => adicionarMercadoNaLista(empresaId),
      );
      return;
    }

    const tirar = (): void => {
      for (const [chave, pendente] of precosPendentes.current) {
        if (pendente.empresaId === empresaId) {
          precosPendentes.current.delete(chave);
        }
      }

      if (mercadoAtual === empresaId) {
        setMercadoAtual(null);
        void saveMercadoAtualDaLista(null);
      }

      gravar(
        () => {
          setMercados((atuais) => atuais.filter((atual) => atual !== empresaId));
          setPrecos((atuais) => atuais.filter((preco) => preco.empresa_id !== empresaId));
        },
        () => removerMercadoDaLista(empresaId),
      );
    };

    const anotados = precos.filter((preco) => preco.empresa_id === empresaId).length;

    if (anotados === 0) {
      tirar();
      return;
    }

    Alert.alert(
      'Tirar da comparação',
      `Tirar ${nomeEmpresa(empresaId)} da comparação? ${anotados} ${anotados === 1 ? 'preço anotado lá será apagado' : 'preços anotados lá serão apagados'}.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Tirar', style: 'destructive', onPress: tirar },
      ],
    );
  };

  // --- Edicao ------------------------------------------------------------------------

  const salvarItem = (dados: DadosItemLista, editando: ItemListaCompras | null): boolean => {
    const descricao = dados.descricao.trim();

    if (!descricao) {
      Alert.alert('Erro', 'Informe o item ou escolha um produto');
      return false;
    }

    if (!Number.isFinite(dados.quantidade) || dados.quantidade <= 0) {
      Alert.alert('Erro', 'A quantidade deve ser maior que zero');
      return false;
    }

    const campos = {
      produto_id: dados.produtoId,
      variante_id: dados.varianteId,
      descricao,
      quantidade: dados.quantidade,
    };

    if (!editando) {
      const item = novoItem(campos, proximaOrdem());
      const agora = new Date().toISOString();

      inserir(
        [item],
        Object.entries(dados.precos).flatMap(([empresaId, { preco, varianteId }]) =>
          preco !== null && preco > 0
            ? [
                {
                  item_id: item.id,
                  empresa_id: empresaId,
                  preco,
                  variante_id: varianteId,
                  updated_at: agora,
                },
              ]
            : [],
        ),
      );
      return true;
    }

    const atualizado: ItemListaCompras = { ...editando, ...campos };

    gravar(
      () =>
        setItens((atuais) => atuais.map((item) => (item.id === atualizado.id ? atualizado : item))),
      () => updateItemListaCompras(atualizado),
    );

    for (const [empresaId, { preco, varianteId }] of Object.entries(dados.precos)) {
      const mudou =
        preco !== precoAnotado(editando.id, empresaId) ||
        varianteId !== varianteAnotada(editando.id, empresaId);

      if (mudou) {
        anotar(editando.id, empresaId, preco, varianteId);
      }
    }

    return true;
  };

  /**
   * Por no carrinho sem preco anotado aqui usa o ultimo preco do historico
   * neste mercado, se houver - o usuario so corrige se a gondola mostrar outro.
   */
  const alternarComprado = (entrada: ItemNaLista): void => {
    const { item } = entrada;
    const atualizado: ItemListaCompras = { ...item, comprado: item.comprado ? 0 : 1 };

    if (atualizado.comprado) {
      vibrarSucesso();

      if (mercadoAtual && entrada.precoAtual === null && entrada.dicaAtual !== null) {
        definirPreco(item.id, mercadoAtual, entrada.dicaAtual);
      }
    } else {
      vibrarSelecao();
    }

    gravar(
      () =>
        setItens((atuais) => atuais.map((atual) => (atual.id === item.id ? atualizado : atual))),
      () => updateItemListaCompras(atualizado),
    );
  };

  const remover = (item: ItemListaCompras): void => {
    const precosDoItem = precos.filter((preco) => preco.item_id === item.id);
    descartarPendentes(new Set([item.id]));

    gravar(
      () => {
        setItens((atuais) => atuais.filter((atual) => atual.id !== item.id));
        setPrecos((atuais) => atuais.filter((preco) => preco.item_id !== item.id));
      },
      () => deleteItemListaCompras(item.id),
    );

    toast.mostrar(`"${item.descricao}" removido`, {
      acao: { rotulo: 'Desfazer', onPress: (): void => inserir([item], precosDoItem) },
    });
  };

  const limparComprados = (): void => {
    if (comprados.length === 0) {
      return;
    }

    Alert.alert(
      'Tirar do carrinho',
      `Remover da lista os ${comprados.length} itens marcados, sem registrar a compra?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: (): void => {
            const ids = new Set(comprados.map((entrada) => entrada.item.id));
            descartarPendentes(ids);
            gravar(
              () => {
                setItens((atuais) => atuais.filter((item) => !ids.has(item.id)));
                setPrecos((atuais) => atuais.filter((preco) => !ids.has(preco.item_id)));
              },
              () => deleteItensComprados(),
            );
          },
        },
      ],
    );
  };

  const esvaziarLista = (): void => {
    if (itens.length === 0) {
      return;
    }

    Alert.alert('Esvaziar lista', 'Remover todos os itens e preços da lista de compras?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Esvaziar',
        style: 'destructive',
        onPress: (): void => {
          precosPendentes.current.clear();
          gravar(
            () => {
              setItens([]);
              setPrecos([]);
            },
            () => deleteTodosItensListaCompras(),
          );
        },
      },
    ]);
  };

  const lerCodigo = (codigo: string): { item: ItemListaCompras; varianteId: string } | null => {
    const variante = variantes.find((atual) => (atual.codigo_barras ?? '').trim() === codigo);

    if (!variante) {
      Alert.alert('Código não encontrado', `Nenhuma variante cadastrada com o código ${codigo}`);
      return null;
    }

    const doProduto = itens.filter((item) => item.produto_id === variante.produto_id);
    const naLista =
      doProduto.find((item) => item.variante_id === variante.id) ??
      doProduto.find((item) => item.variante_id === null);

    // O item volta com a variante lida, para o preco daqui ja sair com a marca certa.
    if (naLista) {
      return { item: naLista, varianteId: variante.id };
    }

    const item = novoItem(
      {
        produto_id: variante.produto_id,
        variante_id: variante.id,
        descricao: produtoPorId.get(variante.produto_id)?.nome ?? 'Item',
        quantidade: 1,
      },
      proximaOrdem(),
    );

    inserir([item]);
    toast.mostrar(`${item.descricao} adicionado à lista`);
    return { item, varianteId: variante.id };
  };

  // --- Finalizacao -------------------------------------------------------------------

  const iniciarFechamento = (): RascunhoLancamento | null => {
    if (comprados.length === 0) {
      Alert.alert('Carrinho vazio', 'Marque os itens que foram para o carrinho.');
      return null;
    }

    if (!mercadoAtual) {
      Alert.alert(
        'Em qual mercado?',
        'Toque no mercado em que você está, em "Mercados", para registrar a compra com os preços de lá.',
      );
      return null;
    }

    const semPreco = comprados.filter((entrada) => entrada.precoAtual === null);

    if (semPreco.length > 0) {
      Alert.alert(
        'Falta o preço',
        `Anote o preço em ${nomeEmpresa(mercadoAtual)} de: ${semPreco
          .map((entrada) => entrada.item.descricao)
          .join(', ')}.`,
      );
      return null;
    }

    // A pesquisa vai para o historico ja; o carrinho neste mercado vai com o
    // lancamento, com o preco que for confirmado nele.
    const noCarrinho = new Set(comprados.map((entrada) => entrada.item.id));
    setPesquisaSalva(0);

    void salvarPesquisaNoHistorico(
      (itemId, empresaId) => empresaId === mercadoAtual && noCarrinho.has(itemId),
    )
      .then(({ salvos }) => setPesquisaSalva(salvos))
      .catch((error: unknown) => {
        console.error('Erro ao levar a pesquisa de precos ao historico:', error);
        Alert.alert('Erro', 'Não foi possível salvar os preços da pesquisa no histórico');
      });

    return {
      descricao: `Compras - ${nomeEmpresa(mercadoAtual)}`,
      empresaId: mercadoAtual,
      categoriaId: categorias.some((categoria) => categoria.id === CATEGORIA_MERCADO)
        ? CATEGORIA_MERCADO
        : null,
      itens: comprados.map(({ item, precoAtual }) => {
        // A marca anotada aqui vale mais; sem ela, a do item ou a unica do produto.
        const varianteId =
          varianteAnotada(item.id, mercadoAtual) ??
          varianteParaHistorico(item, variantesPorProduto);
        const variante = varianteId ? variantePorId.get(varianteId) : undefined;

        return {
          produtoId: item.produto_id,
          varianteId,
          descricao: variante
            ? `${item.descricao} - ${rotuloDaVariante(variante, marcas)}`
            : item.descricao,
          quantidade: item.quantidade,
          precoUnitario: precoAtual ?? 0,
        };
      }),
    };
  };

  const registrarCompra = async (lancamento: NovoLancamento): Promise<void> => {
    // Espera os precos e as marcacoes pendentes antes de apagar os comprados.
    await gravarPrecosPendentes();

    await emTransacao(async () => {
      await registrarLancamento(lancamento, localPadrao);
      await deleteItensComprados();
    });

    await carregar();
  };

  return {
    loading,
    atualizando,
    atualizar,
    pendentes,
    comprados,
    totais,
    mercados: mercadosNaLista,
    comparacao,
    mercadoAtual,
    nomeMercadoAtual: mercadoAtual ? nomeEmpresa(mercadoAtual) : null,
    escolherMercadoAtual,
    alternarMercado,
    nomeEmpresa,
    sugestoes,
    adicionarSugestoes,
    adicionarRapido,
    produtos,
    variantes,
    marcas,
    empresas,
    definirPreco,
    precoAnotado,
    varianteAnotada,
    definirVariantePreco,
    referenciaNoMercado,
    menorPrecoVisto,
    precoBase,
    unitarioDe,
    comparativoVariantes,
    adicionarEmbalagem,
    salvarItem,
    alternarComprado,
    remover,
    limparComprados,
    esvaziarLista,
    apagarPrecos,
    registrarPrecosNoHistorico,
    lerCodigo,
    iniciarFechamento,
    pesquisaSalva,
    registrarCompra,
  };
}
