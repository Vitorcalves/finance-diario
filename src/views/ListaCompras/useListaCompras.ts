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
  type CotacaoNaLista,
  deleteCotacao,
  deleteItemListaCompras,
  deleteItensComprados,
  deleteTodasCotacoesDaLista,
  deleteTodosItensListaCompras,
  getMercadoAtualDaLista,
  insertItensListaCompras,
  type ItemListaCompras,
  listComprasDeProdutos,
  listCotacoesDaLista,
  listItensListaCompras,
  listMercadosDaLista,
  removerMercadoDaLista,
  salvarCotacao,
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
import {
  compararCotacoes,
  type DiferencaParaOMenor,
  diferencaParaOMenor,
} from '../../utils/cotacoesLista';
import { vibrarSelecao, vibrarSucesso } from '../../utils/haptics';
import { Locais } from '../../utils/local';
import {
  selecionarPrecosParaHistorico,
  unicaVarianteDoProduto,
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

/** Categoria sugerida para a compra (criada pela migracao 008). */
const CATEGORIA_MERCADO = 'mercado';

/** Espera depois da ultima tecla antes de gravar os precos digitados. */
const ESPERA_GRAVAR_PRECO = 600;

/** Uma cotacao com a variante que vale para ela e o preco por unidade. */
export type CotacaoNoMercado = {
  cotacao: CotacaoNaLista;
  /** A variante anotada na cotacao ou, sem ela, a unica do produto. */
  varianteId: string | null;
  preco: number;
  /** Preco por kg/L/un; `null` sem variante ou sem medida cadastrada. */
  unitario: PrecoPorUnidade | null;
};

/** O item num dos mercados comparados: a cotacao que vale ali. */
export type PrecoNoMercado = {
  empresaId: string;
  nome: string;
  preco: number | null;
  varianteId: string | null;
  /** Quantas marcas/embalagens foram cotadas ali. */
  cotacoes: number;
  /** Menor preco do item entre os mercados (so com 2 cotacoes ou mais). */
  menor: boolean;
};

/** Um item da lista com a cotacao que vale em cada mercado. */
export type ItemNaLista = {
  item: ItemListaCompras;
  /** `Marca • 500 g` da variante que o item quer levar; `null` quando serve qualquer uma. */
  variante: string | null;
  /** Quantidade pronta para exibir (`2` ou `0,75 kg`). */
  quantidade: string;
  /** Variante vendida por peso/volume: a quantidade e a medida, nao unidades. */
  granel: boolean;
  /** Medida do preco a granel (`kg`, `100 g`); vazio nos pacotes. */
  medida: string;
  /** Na ordem dos mercados comparados. */
  precos: PrecoNoMercado[];
  /** Cotacao que vale no mercado em que o usuario esta. */
  cotacaoAtual: CotacaoNoMercado | null;
  /** Quantas marcas/embalagens foram cotadas no mercado atual. */
  cotacoesAtual: number;
  /** Preco da cotacao que vale no mercado atual. */
  precoAtual: number | null;
  /** Ultimo preco do historico no mercado atual, sugerido no campo vazio. */
  dicaAtual: number | null;
  /**
   * Marca da cotacao que vale aqui, quando ela diz algo a mais: o produto tem
   * mais de uma variante e nao e a que o item ja mostra.
   */
  marcaAtual: string | null;
  /** Preco aqui reduzido a unidade primaria da variante (R$/kg, R$/L, R$/un). */
  unitarioAtual: PrecoPorUnidade | null;
  /**
   * A unica cotacao aqui pode ganhar uma marca: o produto tem mais de uma
   * variante e ela nao tem. Sem a marca o preco fica fora do historico.
   */
  escolheMarca: boolean;
  /**
   * Quanto a cotacao daqui passa da menor dos outros mercados (por unidade
   * quando da): zero ou negativo = aqui e o mais barato. `null` sem preco aqui
   * ou sem preco em outro lugar.
   */
  diferencaAtual: DiferencaParaOMenor | null;
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

/** Uma cotacao como ficou no painel do item; preco `null` apaga. */
export type CotacaoEditada = {
  id: string;
  empresaId: string;
  varianteId: string | null;
  preco: number | null;
};

/** Campos do formulario de item. */
export type DadosItemLista = {
  produtoId: string | null;
  /** Marca/embalagem que o item quer levar; `null` = a mais barata de cada mercado. */
  varianteId: string | null;
  descricao: string;
  quantidade: number;
  /** Todas as cotacoes do item, em todos os mercados; as que nao vierem sao apagadas. */
  cotacoes: CotacaoEditada[];
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

  /**
   * Preco digitado no campo da linha: cai na cotacao que vale no mercado (ou
   * cria a primeira); `null` apaga. Grava logo depois de parar de digitar.
   */
  definirPreco: (item: ItemListaCompras, empresaId: string, preco: number | null) => void;
  /** Cotacoes do item em todos os mercados, na ordem em que foram anotadas. */
  cotacoesDoItem: (itemId: string) => CotacaoNaLista[];
  cotacaoPorId: (id: string) => CotacaoNaLista | null;
  /** Marca/variante vista na cotacao; `null` = nao informada. */
  definirVarianteCotacao: (cotacaoId: string, varianteId: string | null) => void;
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

  /** Grava o item; `false` quando os dados nao passaram na validacao. */
  salvarItem: (dados: DadosItemLista, editando: ItemListaCompras | null) => boolean;
  alternarComprado: (entrada: ItemNaLista) => void;
  remover: (item: ItemListaCompras) => void;
  limparComprados: () => void;
  esvaziarLista: () => void;
  apagarPrecos: () => void;
  /** Grava no historico todas as cotacoes que ainda nao estao la. */
  registrarPrecosNoHistorico: () => void;
  /** Acha (ou poe na lista) o produto do codigo lido, para anotar o preco dele. */
  lerCodigo: (codigo: string) => { item: ItemListaCompras; varianteId: string } | null;
  /**
   * Valida o carrinho e monta o lancamento a conferir (`null` se faltar algo).
   * Ja leva ao historico as cotacoes da pesquisa; a que vale para cada item do
   * carrinho, no mercado da compra, vai com o proprio lancamento.
   */
  iniciarFechamento: () => RascunhoLancamento | null;
  /** Quantos precos da pesquisa o ultimo fechamento levou ao historico. */
  pesquisaSalva: number;
  /** Grava o lancamento e tira da lista o que foi comprado. */
  registrarCompra: (lancamento: NovoLancamento) => Promise<void>;
};

/** Gravacao de cotacao esperando a pausa na digitacao. */
type GravacaoPendente = { tipo: 'salvar' | 'apagar'; cotacao: CotacaoNaLista };

const chavePreco = (itemId: string, empresaId: string): string => `${itemId}|${empresaId}`;

/**
 * Lista de compras como pesquisa de precos: cada item recebe as cotacoes
 * (marca/embalagem e preco) vistas em cada mercado, a tela compara lado a lado
 * e, no mercado escolhido, os itens vao para o carrinho e viram um lancamento
 * com itens.
 */
export function useListaCompras(): UseListaCompras {
  const toast = useToast();
  const [itens, setItens] = useState<ItemListaCompras[]>([]);
  const [cotacoes, setCotacoes] = useState<CotacaoNaLista[]>([]);
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
  /** Cotacoes digitadas aguardando a pausa na digitacao, pelo id da cotacao. */
  const gravacoesPendentes = useRef(new Map<string, GravacaoPendente>());
  const timerPrecos = useRef<ReturnType<typeof setTimeout> | null>(null);
  /**
   * Cotacao criada pelo campo da linha em cada item|mercado: a tecla seguinte
   * cai nela mesmo que a tela ainda nao tenha atualizado.
   */
  const criadasPeloCampo = useRef(new Map<string, string>());

  const carregarDoBanco = useCallback(async (): Promise<void> => {
    const [
      itensDoBanco,
      cotacoesDoBanco,
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
      listCotacoesDaLista(),
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
    setCotacoes(cotacoesDoBanco);
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

  /** Manda ao banco as cotacoes digitadas ate agora; resolve quando a fila esvaziar. */
  const gravarPendentes = useCallback((): Promise<void> => {
    if (timerPrecos.current) {
      clearTimeout(timerPrecos.current);
      timerPrecos.current = null;
    }

    const lote = [...gravacoesPendentes.current.values()];
    gravacoesPendentes.current.clear();

    if (lote.length > 0) {
      fila.current = fila.current
        .then(async () => {
          for (const { tipo, cotacao } of lote) {
            await (tipo === 'salvar' ? salvarCotacao(cotacao) : deleteCotacao(cotacao.id));
          }
        })
        .catch(erroAoGravar);
    }

    return fila.current;
  }, [erroAoGravar]);

  /** Esquece gravacoes ainda pendentes das cotacoes que vao sair da lista. */
  const descartarPendentes = (sai: (cotacao: CotacaoNaLista) => boolean): void => {
    for (const [id, { cotacao }] of gravacoesPendentes.current) {
      if (sai(cotacao)) {
        gravacoesPendentes.current.delete(id);
      }
    }
  };

  const carregar = useCallback(async (): Promise<void> => {
    try {
      await gravarPendentes();
      await carregarDoBanco();
    } catch (error: unknown) {
      console.error('Erro ao carregar a lista de compras:', error);
      Alert.alert('Erro', 'Não foi possível carregar a lista de compras');
    } finally {
      setLoading(false);
    }
  }, [gravarPendentes, carregarDoBanco]);

  useFocusEffect(
    useCallback(() => {
      void carregar();

      // Saindo da tela, o que foi digitado vai para o banco na hora.
      return (): void => {
        void gravarPendentes();
      };
    }, [carregar, gravarPendentes]),
  );

  useEffect(
    () => (): void => {
      void gravarPendentes();
    },
    [gravarPendentes],
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

  /** Guarda a gravacao (a mais nova da cotacao vale) e espera a pausa na digitacao. */
  const agendarGravacao = (gravacao: GravacaoPendente): void => {
    gravacoesPendentes.current.set(gravacao.cotacao.id, gravacao);

    if (timerPrecos.current) {
      clearTimeout(timerPrecos.current);
    }

    timerPrecos.current = setTimeout(() => {
      void gravarPendentes();
    }, ESPERA_GRAVAR_PRECO);
  };

  /** Poe a cotacao na tela (no lugar da antiga, se ja existia) e agenda a gravacao. */
  const anotarCotacao = (cotacao: CotacaoNaLista): void => {
    setCotacoes((atuais) =>
      atuais.some((atual) => atual.id === cotacao.id)
        ? atuais.map((atual) => (atual.id === cotacao.id ? cotacao : atual))
        : [...atuais, cotacao],
    );
    agendarGravacao({ tipo: 'salvar', cotacao });
  };

  const apagarCotacao = (cotacao: CotacaoNaLista): void => {
    setCotacoes((atuais) => atuais.filter((atual) => atual.id !== cotacao.id));
    agendarGravacao({ tipo: 'apagar', cotacao });
  };

  // --- Consultas -----------------------------------------------------------------

  const itemPorId = useMemo(() => new Map(itens.map((item) => [item.id, item])), [itens]);
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

  /** A variante pode ter saido do cadastro: a cotacao dela fica sem marca. */
  const cotacoesValidas = useMemo(
    () =>
      cotacoes.map((cotacao) =>
        cotacao.variante_id && !variantePorId.has(cotacao.variante_id)
          ? { ...cotacao, variante_id: null }
          : cotacao,
      ),
    [cotacoes, variantePorId],
  );

  const cotacoesDoItem = useCallback(
    (itemId: string): CotacaoNaLista[] =>
      cotacoesValidas.filter((cotacao) => cotacao.item_id === itemId),
    [cotacoesValidas],
  );

  const cotacaoPorId = useCallback(
    (id: string): CotacaoNaLista | null =>
      cotacoesValidas.find((cotacao) => cotacao.id === id) ?? null,
    [cotacoesValidas],
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

  /** Variante de uma cotacao nova: a que o item quer levar ou a unica do produto. */
  const variantePadrao = (item: ItemListaCompras): string | null =>
    (item.variante_id && variantePorId.has(item.variante_id) ? item.variante_id : null) ??
    unicaVarianteDoProduto(item.produto_id, variantesPorProduto);

  // --- Cotacoes de cada item em cada mercado ---------------------------------------

  /** Cotacoes pela chave item|mercado, cada uma com a variante e o preco por unidade. */
  const cotacoesPorChave = useMemo(() => {
    const porChave = new Map<string, CotacaoNoMercado[]>();

    for (const cotacao of cotacoesValidas) {
      const item = itemPorId.get(cotacao.item_id);

      if (!item) {
        continue;
      }

      const varianteId =
        cotacao.variante_id ?? unicaVarianteDoProduto(item.produto_id, variantesPorProduto);
      const chave = chavePreco(cotacao.item_id, cotacao.empresa_id);

      porChave.set(chave, [
        ...(porChave.get(chave) ?? []),
        {
          cotacao,
          varianteId,
          preco: cotacao.preco,
          unitario: unitarioDe(cotacao.preco, varianteId),
        },
      ]);
    }

    return porChave;
  }, [cotacoesValidas, itemPorId, variantesPorProduto, unitarioDe]);

  /** A cotacao que vale em cada item|mercado: a da variante do item ou a mais barata. */
  const valePorChave = useMemo(() => {
    const porChave = new Map<string, CotacaoNoMercado>();

    for (const [chave, doMercado] of cotacoesPorChave) {
      const item = itemPorId.get(doMercado[0].cotacao.item_id);
      const { vale } = compararCotacoes(doMercado, item?.variante_id ?? null);

      if (vale) {
        porChave.set(chave, vale);
      }
    }

    return porChave;
  }, [cotacoesPorChave, itemPorId]);

  const cotacoesNoMercado = useCallback(
    (itemId: string, empresaId: string): CotacaoNoMercado[] =>
      cotacoesPorChave.get(chavePreco(itemId, empresaId)) ?? [],
    [cotacoesPorChave],
  );

  const valeNoMercado = useCallback(
    (itemId: string, empresaId: string): CotacaoNoMercado | null =>
      valePorChave.get(chavePreco(itemId, empresaId)) ?? null,
    [valePorChave],
  );

  // --- Comparacao ----------------------------------------------------------------

  const comparativo = useMemo(
    () =>
      compararLista(
        itens.map((item) => ({ id: item.id, quantidade: item.quantidade })),
        mercados,
        [...valePorChave.values()].map((vale) => ({
          itemId: vale.cotacao.item_id,
          empresaId: vale.cotacao.empresa_id,
          preco: vale.preco,
          precoUnitario: vale.unitario,
        })),
      ),
    [itens, mercados, valePorChave],
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
        const precosDoItem = mercados.map((empresaId): PrecoNoMercado => {
          const vale = valeNoMercado(item.id, empresaId);

          return {
            empresaId,
            nome: nomeEmpresa(empresaId),
            preco: vale?.preco ?? null,
            varianteId: vale?.varianteId ?? null,
            cotacoes: cotacoesNoMercado(item.id, empresaId).length,
            menor: Boolean(menor && menor.cotacoes > 1 && menor.mercados.includes(empresaId)),
          };
        });

        const cotacaoAtual = mercadoAtual ? valeNoMercado(item.id, mercadoAtual) : null;
        const cotacoesAtual = mercadoAtual ? cotacoesNoMercado(item.id, mercadoAtual).length : 0;
        const variantesDoProduto = item.produto_id
          ? (variantesPorProduto.get(item.produto_id)?.length ?? 0)
          : 0;
        const anotada = cotacaoAtual?.cotacao.variante_id
          ? variantePorId.get(cotacaoAtual.cotacao.variante_id)
          : undefined;
        const outros = mercados
          .filter((empresaId) => empresaId !== mercadoAtual)
          .map((empresaId) => valeNoMercado(item.id, empresaId))
          .filter((vale): vale is CotacaoNoMercado => vale !== null);

        return {
          item,
          variante: variante ? rotuloDaVariante(variante, marcas) : null,
          quantidade: rotuloQuantidadeDaVariante(item.quantidade, variante),
          granel: ehGranel(variante),
          medida: variante && ehGranel(variante) ? medidaGranel(variante) : '',
          precos: precosDoItem,
          cotacaoAtual,
          cotacoesAtual,
          precoAtual: cotacaoAtual?.preco ?? null,
          dicaAtual: mercadoAtual
            ? (referenciaNoMercado(
                {
                  produto_id: item.produto_id,
                  variante_id: cotacaoAtual?.varianteId ?? item.variante_id,
                },
                mercadoAtual,
              )?.preco ?? null)
            : null,
          marcaAtual:
            anotada && variantesDoProduto > 1 && anotada.id !== item.variante_id
              ? rotuloDaVariante(anotada, marcas)
              : null,
          unitarioAtual: cotacaoAtual?.unitario ?? null,
          escolheMarca:
            cotacoesAtual === 1 &&
            cotacaoAtual !== null &&
            cotacaoAtual.cotacao.variante_id === null &&
            variantesDoProduto > 1,
          diferencaAtual: cotacaoAtual ? diferencaParaOMenor(cotacaoAtual, outros) : null,
        };
      }),
    [
      itens,
      variantePorId,
      comparativo,
      mercados,
      nomeEmpresa,
      valeNoMercado,
      cotacoesNoMercado,
      variantesPorProduto,
      mercadoAtual,
      marcas,
      referenciaNoMercado,
    ],
  );

  const pendentesNaTela = useMemo(
    () => naTela.filter((entrada) => !entrada.item.comprado),
    [naTela],
  );
  const comprados = useMemo(() => naTela.filter((entrada) => entrada.item.comprado), [naTela]);

  const totais = useMemo((): TotaisLista => {
    const atual = comparativo.mercados.find((mercado) => mercado.empresaId === mercadoAtual);

    return {
      itens: itens.length,
      pendentes: pendentesNaTela.length,
      comprados: comprados.length,
      noMercadoAtual: atual?.total ?? 0,
      itensComPrecoAtual: atual?.itensComPreco ?? 0,
      noCarrinho: comprados.reduce(
        (soma, entrada) => soma + (entrada.precoAtual ?? 0) * entrada.item.quantidade,
        0,
      ),
      carrinhoSemPreco: comprados.filter((entrada) => entrada.precoAtual === null).length,
    };
  }, [comparativo, mercadoAtual, itens, pendentesNaTela, comprados]);

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

  const inserir = (novos: ItemListaCompras[], cotacoesDosNovos: CotacaoNaLista[] = []): void => {
    gravar(
      () => {
        setItens((atuais) => [...atuais, ...novos]);
        setCotacoes((atuais) => [...atuais, ...cotacoesDosNovos]);
      },
      async () => {
        await insertItensListaCompras(novos);

        for (const cotacao of cotacoesDosNovos) {
          await salvarCotacao(cotacao);
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

  // --- Cotacoes ----------------------------------------------------------------------

  const definirPreco = (item: ItemListaCompras, empresaId: string, preco: number | null): void => {
    const valor = preco !== null && preco > 0 ? preco : null;
    const doMercado = cotacoesNoMercado(item.id, empresaId);
    // Com varias cotacoes o campo mostra a que vale; e nela que o preco cai.
    const alvo =
      doMercado.length === 1
        ? doMercado[0].cotacao
        : (valeNoMercado(item.id, empresaId)?.cotacao ?? null);
    const agora = new Date().toISOString();

    if (alvo) {
      // Digitar o preco mantem a marca que ja estava anotada com ele.
      if (valor === null) {
        apagarCotacao(alvo);
      } else {
        anotarCotacao({ ...alvo, preco: valor, updated_at: agora });
      }
      return;
    }

    if (valor === null) {
      return;
    }

    const chave = chavePreco(item.id, empresaId);
    const id = criadasPeloCampo.current.get(chave) ?? uuidv4();
    criadasPeloCampo.current.set(chave, id);

    anotarCotacao({
      id,
      item_id: item.id,
      empresa_id: empresaId,
      preco: valor,
      variante_id: variantePadrao(item),
      updated_at: agora,
    });
  };

  const definirVarianteCotacao = (cotacaoId: string, varianteId: string | null): void => {
    const cotacao = cotacaoPorId(cotacaoId);

    if (cotacao && cotacao.variante_id !== varianteId) {
      vibrarSelecao();
      anotarCotacao({ ...cotacao, variante_id: varianteId, updated_at: new Date().toISOString() });
    }
  };

  const apagarPrecos = (): void => {
    if (cotacoes.length === 0) {
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
            gravacoesPendentes.current.clear();
            gravar(
              () => setCotacoes([]),
              () => deleteTodasCotacoesDaLista(),
            );
          },
        },
      ],
    );
  };

  /**
   * Leva ao historico as cotacoes que ainda nao estao la (cada uma com a data
   * em que foi anotada). Devolve quantas gravou e quantos itens ficaram de fora
   * por nao terem marca definida.
   */
  const salvarPesquisaNoHistorico = async (
    ignorar?: (cotacao: CotacaoNaLista) => boolean,
  ): Promise<{ salvos: number; semMarca: number }> => {
    await gravarPendentes();

    const { registros, semMarca } = selecionarPrecosParaHistorico(
      itens,
      cotacoesValidas,
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
      descartarPendentes((cotacao) => cotacao.empresa_id === empresaId);

      if (mercadoAtual === empresaId) {
        setMercadoAtual(null);
        void saveMercadoAtualDaLista(null);
      }

      gravar(
        () => {
          setMercados((atuais) => atuais.filter((atual) => atual !== empresaId));
          setCotacoes((atuais) => atuais.filter((cotacao) => cotacao.empresa_id !== empresaId));
        },
        () => removerMercadoDaLista(empresaId),
      );
    };

    const anotadas = cotacoes.filter((cotacao) => cotacao.empresa_id === empresaId).length;

    if (anotadas === 0) {
      tirar();
      return;
    }

    Alert.alert(
      'Tirar da comparação',
      `Tirar ${nomeEmpresa(empresaId)} da comparação? ${anotadas} ${anotadas === 1 ? 'preço anotado lá será apagado' : 'preços anotados lá serão apagados'}.`,
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
    const agora = new Date().toISOString();
    const preenchidas = dados.cotacoes.flatMap((editada) =>
      editada.preco !== null && editada.preco > 0 ? [{ ...editada, preco: editada.preco }] : [],
    );
    const paraGravar = (itemId: string): CotacaoNaLista[] =>
      preenchidas.map((editada) => ({
        id: editada.id,
        item_id: itemId,
        empresa_id: editada.empresaId,
        preco: editada.preco,
        variante_id: editada.varianteId,
        updated_at: agora,
      }));

    if (!editando) {
      const item = novoItem(campos, proximaOrdem());
      inserir([item], paraGravar(item.id));
      return true;
    }

    const atualizado: ItemListaCompras = { ...editando, ...campos };

    gravar(
      () =>
        setItens((atuais) => atuais.map((item) => (item.id === atualizado.id ? atualizado : item))),
      () => updateItemListaCompras(atualizado),
    );

    const ficam = new Set(preenchidas.map((editada) => editada.id));

    for (const atual of cotacoesDoItem(editando.id)) {
      if (!ficam.has(atual.id)) {
        apagarCotacao(atual);
      }
    }

    for (const nova of paraGravar(editando.id)) {
      const atual = cotacaoPorId(nova.id);
      const mudou =
        !atual ||
        atual.preco !== nova.preco ||
        atual.variante_id !== nova.variante_id ||
        atual.empresa_id !== nova.empresa_id;

      if (mudou) {
        anotarCotacao(nova);
      }
    }

    return true;
  };

  /**
   * Por no carrinho sem preco anotado aqui usa o ultimo preco do historico
   * neste mercado, com a marca dele - o usuario so corrige se a gondola
   * mostrar outro.
   */
  const alternarComprado = (entrada: ItemNaLista): void => {
    const { item } = entrada;
    const atualizado: ItemListaCompras = { ...item, comprado: item.comprado ? 0 : 1 };

    if (atualizado.comprado) {
      vibrarSucesso();

      const referencia =
        mercadoAtual && entrada.cotacaoAtual === null
          ? referenciaNoMercado(item, mercadoAtual)
          : null;

      if (mercadoAtual && referencia) {
        anotarCotacao({
          id: uuidv4(),
          item_id: item.id,
          empresa_id: mercadoAtual,
          preco: referencia.preco,
          variante_id:
            referencia.varianteId && variantePorId.has(referencia.varianteId)
              ? referencia.varianteId
              : variantePadrao(item),
          updated_at: new Date().toISOString(),
        });
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
    const cotacoesRemovidas = cotacoesDoItem(item.id);
    descartarPendentes((cotacao) => cotacao.item_id === item.id);

    gravar(
      () => {
        setItens((atuais) => atuais.filter((atual) => atual.id !== item.id));
        setCotacoes((atuais) => atuais.filter((cotacao) => cotacao.item_id !== item.id));
      },
      () => deleteItemListaCompras(item.id),
    );

    toast.mostrar(`"${item.descricao}" removido`, {
      acao: { rotulo: 'Desfazer', onPress: (): void => inserir([item], cotacoesRemovidas) },
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
            descartarPendentes((cotacao) => ids.has(cotacao.item_id));
            gravar(
              () => {
                setItens((atuais) => atuais.filter((item) => !ids.has(item.id)));
                setCotacoes((atuais) => atuais.filter((cotacao) => !ids.has(cotacao.item_id)));
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
          gravacoesPendentes.current.clear();
          gravar(
            () => {
              setItens([]);
              setCotacoes([]);
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

    // As marcas do produto sao cotacoes do mesmo item: qualquer item dele serve.
    const doProduto = itens.filter((item) => item.produto_id === variante.produto_id);
    const naLista =
      doProduto.find((item) => item.variante_id === variante.id) ??
      doProduto.find((item) => !item.comprado) ??
      doProduto[0];

    // O item volta com a variante lida, para a cotacao daqui ja sair com a marca certa.
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

    const semPreco = comprados.filter((entrada) => entrada.cotacaoAtual === null);

    if (semPreco.length > 0) {
      Alert.alert(
        'Falta o preço',
        `Anote o preço em ${nomeEmpresa(mercadoAtual)} de: ${semPreco
          .map((entrada) => entrada.item.descricao)
          .join(', ')}.`,
      );
      return null;
    }

    // A pesquisa vai para o historico ja - inclusive as outras marcas cotadas
    // aqui. A cotacao comprada vai com o lancamento, com o preco confirmado nele.
    const compradas = new Set(
      comprados.flatMap((entrada) =>
        entrada.cotacaoAtual ? [entrada.cotacaoAtual.cotacao.id] : [],
      ),
    );
    setPesquisaSalva(0);

    void salvarPesquisaNoHistorico((cotacao) => compradas.has(cotacao.id))
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
      itens: comprados.map(({ item, cotacaoAtual }) => {
        const varianteId = cotacaoAtual?.varianteId ?? null;
        const variante = varianteId ? variantePorId.get(varianteId) : undefined;

        return {
          produtoId: item.produto_id,
          varianteId,
          descricao: variante
            ? `${item.descricao} - ${rotuloDaVariante(variante, marcas)}`
            : item.descricao,
          quantidade: item.quantidade,
          precoUnitario: cotacaoAtual?.preco ?? 0,
        };
      }),
    };
  };

  const registrarCompra = async (lancamento: NovoLancamento): Promise<void> => {
    // Espera os precos e as marcacoes pendentes antes de apagar os comprados.
    await gravarPendentes();

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
    pendentes: pendentesNaTela,
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
    cotacoesDoItem,
    cotacaoPorId,
    definirVarianteCotacao,
    referenciaNoMercado,
    menorPrecoVisto,
    precoBase,
    unitarioDe,
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
