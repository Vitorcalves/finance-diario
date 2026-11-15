import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { useToast } from '../../components/ui';
import { emTransacao } from '../../models/database';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { type HistoricoPreco, listHistoricoPrecoDeAtivos } from '../../models/historicoPreco';
import { listMarcas, type Marca } from '../../models/marcas';
import { listProdutos, type Produto } from '../../models/produtos';
import {
  listProdutoVariantes,
  type ProdutoVariantes,
  registrarPrecoVariante,
} from '../../models/produtoVariantes';
import { getLocalPadrao } from '../../models/settingsModel';
import { agruparVariantesPorProduto } from '../../utils/comparativoVariantes';
import {
  compararMercados,
  maisRecentePrimeiro,
  menorTotalCompleto as menorTotalEntreCompletos,
} from '../../utils/comparativoMercados';
import { Locais } from '../../utils/local';
import {
  precoPorUnidadePrimaria,
  rotuloQuantidade as rotuloQuantidadeDaVariante,
  rotuloVariantePorId,
} from '../../utils/variantes';
import type {
  ComparativoMercado,
  ComparativoProduto,
  DadosItemOrcamento,
  ItemComUnitario,
  ItemOrcamento,
} from './types';

const todayIso = (): string => dayjs().format('YYYY-MM-DD');

export type UseOrcamento = {
  loading: boolean;
  salvando: boolean;

  empresas: Empresa[];
  produtos: Produto[];
  variantes: ProdutoVariantes[];
  marcas: Marca[];

  empresaSelecionada: string | null;
  alternarEmpresa: (id: string) => void;
  dataOrcamento: string;
  setDataOrcamento: (data: string) => void;
  /** Muda quando o orcamento e limpo, para recriar o campo de data. */
  dataInputKey: number;

  itens: ItemOrcamento[];
  /** Grava o item; devolve `false` quando a variante ja esta no orcamento. */
  salvarItem: (dados: DadosItemOrcamento, index: number | null) => boolean;
  removerItem: (index: number) => void;
  totalOrcamento: number;

  /** Cada item do orcamento com o preco reduzido a unidade primaria. */
  itensComUnitario: ItemComUnitario[];
  /**
   * Compara, dentro do orcamento atual, variantes de um mesmo produto pelo
   * preco por unidade primaria (ex.: leite de 500 ml x leite de 1 L).
   */
  comparativoVariantes: ComparativoProduto[];

  comparativo: ComparativoMercado[];
  /** Menor total entre os mercados que cobrem todos os itens. */
  menorTotalCompleto: number | null;

  /** Ultimo preco visto para a variante, opcionalmente restrito a um mercado. */
  ultimoPreco: (varianteId: string, empresaId: string | null) => HistoricoPreco | null;
  menorPrecoRegistrado: (varianteId: string) => HistoricoPreco | null;
  precoBaseDaVariante: (varianteId: string) => number | null;

  nomeEmpresa: (id: string | null) => string;
  rotuloVariante: (varianteId: string) => string;
  /** Quantidade de um item pronta para exibir (`2` ou `0,75 kg` nas variantes a granel). */
  rotuloQuantidade: (quantidade: number, varianteId: string) => string;

  limpar: () => void;
  registrarPrecos: () => Promise<void>;
};

/** Estado do orcamento e comparacao dos precos entre mercados. */
export function useOrcamento(): UseOrcamento {
  const toast = useToast();
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [historico, setHistorico] = useState<HistoricoPreco[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [empresaSelecionada, setEmpresaSelecionada] = useState<string | null>(null);
  /** Configurado na tela de menu; usado sem perguntar ao registrar precos. */
  const [localPadrao, setLocalPadrao] = useState(Locais.padrao);
  const [dataOrcamento, setDataOrcamento] = useState(todayIso());
  const [dataInputKey, setDataInputKey] = useState(0);
  const [itens, setItens] = useState<ItemOrcamento[]>([]);

  /**
   * Recarrega os cadastros a cada foco sem trocar a tela pelo indicador de
   * carregamento: o item que estava sendo digitado continua no formulario.
   */
  const carregarDados = useCallback(async (): Promise<void> => {
    try {
      const [
        empresasDoBanco,
        produtosDoBanco,
        variantesDoBanco,
        marcasDoBanco,
        historicoDoBanco,
        localPadraoDoBanco,
      ] = await Promise.all([
        listEmpresas(),
        listProdutos(),
        listProdutoVariantes(),
        // Com as excluidas: a variante que ja usa a marca continua com ela no rotulo.
        listMarcas({ comExcluidos: true }),
        // So de cadastro ativo: preco de variante ou mercado excluido nao entra na comparacao.
        listHistoricoPrecoDeAtivos(),
        getLocalPadrao(),
      ]);

      setEmpresas(empresasDoBanco);
      setProdutos(produtosDoBanco);
      setVariantes(variantesDoBanco);
      setMarcas(marcasDoBanco);
      setHistorico(historicoDoBanco);
      setLocalPadrao(localPadraoDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar dados do orcamento:', error);
      Alert.alert('Erro', 'Não foi possível carregar os dados do orçamento');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregarDados();
    }, [carregarDados]),
  );

  const nomeProduto = useCallback(
    (id: string): string =>
      produtos.find((produto) => produto.id === id)?.nome ?? 'Produto removido',
    [produtos],
  );

  const nomeEmpresa = useCallback(
    (id: string | null): string =>
      empresas.find((empresa) => empresa.id === id)?.nome ?? 'Sem mercado',
    [empresas],
  );

  const rotuloVariante = useCallback(
    (varianteId: string): string => rotuloVariantePorId(varianteId, variantes, marcas),
    [variantes, marcas],
  );

  const rotuloQuantidade = useCallback(
    (quantidade: number, varianteId: string): string =>
      rotuloQuantidadeDaVariante(
        quantidade,
        variantes.find((variante) => variante.id === varianteId),
      ),
    [variantes],
  );

  const ultimoPreco = useCallback(
    (varianteId: string, empresaId: string | null): HistoricoPreco | null => {
      const registros = historico
        .filter(
          (registro) =>
            registro.variante_id === varianteId &&
            (empresaId === null || registro.empresa_id === empresaId),
        )
        .sort(maisRecentePrimeiro);

      return registros[0] ?? null;
    },
    [historico],
  );

  const menorPrecoRegistrado = useCallback(
    (varianteId: string): HistoricoPreco | null => {
      const registros = historico.filter((registro) => registro.variante_id === varianteId);

      if (registros.length === 0) {
        return null;
      }

      return registros.reduce((menor, atual) => (atual.preco < menor.preco ? atual : menor));
    },
    [historico],
  );

  const precoBaseDaVariante = useCallback(
    (varianteId: string): number | null =>
      variantes.find((variante) => variante.id === varianteId)?.preco ?? null,
    [variantes],
  );

  const totalOrcamento = useMemo(
    () => itens.reduce((soma, item) => soma + item.quantidade * item.preco, 0),
    [itens],
  );

  const itensComUnitario = useMemo(
    (): ItemComUnitario[] =>
      itens.map((item) => ({
        item,
        unitario: precoPorUnidadePrimaria(
          item.preco,
          variantes.find((variante) => variante.id === item.varianteId),
        ),
      })),
    [itens, variantes],
  );

  /**
   * Agrupa por produto os itens do orcamento e, quando ha mais de uma variante
   * do mesmo produto, aponta a mais barata por unidade primaria: o preco pago
   * sozinho nao diz nada quando as embalagens tem tamanhos diferentes.
   */
  const comparativoVariantes = useMemo(
    (): ComparativoProduto[] =>
      agruparVariantesPorProduto(itensComUnitario, (item) => item.produtoId).map((grupo) => ({
        ...grupo,
        nomeProduto: nomeProduto(grupo.produtoId),
      })),
    [itensComUnitario, nomeProduto],
  );

  /**
   * Simula o total do orcamento em cada mercado: no mercado selecionado usa os precos
   * digitados agora, nos demais usa o preco mais recente ja registrado no historico.
   */
  const comparativo = useMemo((): ComparativoMercado[] => {
    if (itens.length === 0) {
      return [];
    }

    const precoDigitado = new Map(itens.map((item) => [item.localId, item.preco]));

    return compararMercados(
      itens.map((item) => ({
        id: item.localId,
        produtoId: item.produtoId,
        varianteId: item.varianteId,
        quantidade: item.quantidade,
      })),
      historico,
      {
        incluir: empresaSelecionada ? [empresaSelecionada] : [],
        precoFixo: (item, empresaId) =>
          empresaId === empresaSelecionada ? precoDigitado.get(item.id) : undefined,
      },
    ).map((mercado) => ({
      empresaId: mercado.empresaId,
      nome: nomeEmpresa(mercado.empresaId),
      total: mercado.total,
      itensComPreco: mercado.itensComPreco,
      completo: mercado.completo,
      mercadoDoOrcamento: mercado.empresaId === empresaSelecionada,
    }));
  }, [itens, historico, empresaSelecionada, nomeEmpresa]);

  /** So faz sentido eleger o mais barato entre mercados que cobrem todos os itens. */
  const menorTotalCompleto = useMemo(() => menorTotalEntreCompletos(comparativo), [comparativo]);

  const alternarEmpresa = useCallback((id: string): void => {
    setEmpresaSelecionada((atual) => (atual === id ? null : id));
  }, []);

  const salvarItem = useCallback(
    (dados: DadosItemOrcamento, index: number | null): boolean => {
      const duplicado = itens.findIndex((item) => item.varianteId === dados.varianteId);

      if (duplicado !== -1 && duplicado !== index) {
        Alert.alert('Erro', 'Esta variante já está no orçamento. Edite o item existente.');
        return false;
      }

      const item: ItemOrcamento = {
        ...dados,
        localId: index !== null ? itens[index].localId : uuidv4(),
        descricao: `${nomeProduto(dados.produtoId)} - ${rotuloVariante(dados.varianteId)}`,
      };

      setItens((prev) => {
        if (index === null) {
          return [...prev, item];
        }

        const copia = [...prev];
        copia[index] = item;
        return copia;
      });

      return true;
    },
    [itens, nomeProduto, rotuloVariante],
  );

  const removerItem = useCallback((index: number): void => {
    setItens((prev) => prev.filter((_, posicao) => posicao !== index));
  }, []);

  const limpar = useCallback((): void => {
    setItens([]);
    setDataOrcamento(todayIso());
    setDataInputKey((atual) => atual + 1);
  }, []);

  const registrarPrecos = useCallback(async (): Promise<void> => {
    if (!empresaSelecionada) {
      Alert.alert('Erro', 'Selecione o mercado onde os preços foram pesquisados');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataOrcamento)) {
      Alert.alert('Erro', 'Informe uma data válida');
      return;
    }

    if (itens.length === 0) {
      Alert.alert('Erro', 'Adicione ao menos um item ao orçamento');
      return;
    }

    try {
      setSalvando(true);

      // Ou todos os precos entram no historico, ou nenhum.
      await emTransacao(async () => {
        for (const item of itens) {
          await registrarPrecoVariante({
            produtoId: item.produtoId,
            varianteId: item.varianteId,
            empresaId: empresaSelecionada,
            preco: item.preco,
            data: dataOrcamento,
            local: localPadrao,
          });
        }
      });

      const quantidadeRegistrada = itens.length;

      limpar();
      await carregarDados();

      toast.mostrar(
        `${quantidadeRegistrada} ${quantidadeRegistrada === 1 ? 'preço registrado' : 'preços registrados'} no histórico de ${nomeEmpresa(empresaSelecionada)}`,
      );
    } catch (error: unknown) {
      console.error('Erro ao registrar precos do orcamento:', error);
      Alert.alert('Erro', 'Não foi possível registrar os preços no histórico');
    } finally {
      setSalvando(false);
    }
  }, [
    empresaSelecionada,
    localPadrao,
    dataOrcamento,
    itens,
    limpar,
    carregarDados,
    nomeEmpresa,
    toast,
  ]);

  return {
    loading,
    salvando,
    empresas,
    produtos,
    variantes,
    marcas,
    empresaSelecionada,
    alternarEmpresa,
    dataOrcamento,
    setDataOrcamento,
    dataInputKey,
    itens,
    salvarItem,
    removerItem,
    totalOrcamento,
    itensComUnitario,
    comparativoVariantes,
    comparativo,
    menorTotalCompleto,
    ultimoPreco,
    menorPrecoRegistrado,
    precoBaseDaVariante,
    nomeEmpresa,
    rotuloVariante,
    rotuloQuantidade,
    limpar,
    registrarPrecos,
  };
}
