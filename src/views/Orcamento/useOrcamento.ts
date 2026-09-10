import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { v4 as uuidv4 } from 'uuid';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { type HistoricoPreco, listHistoricoPreco } from '../../models/historicoPreco';
import { listMarcas, type Marca } from '../../models/marcas';
import { listProdutos, type Produto } from '../../models/produtos';
import {
  listProdutoVariantes,
  type ProdutoVariantes,
  registrarPrecoVariante,
} from '../../models/produtoVariantes';
import { precoPorUnidadePrimaria, rotuloVariantePorId } from '../../utils/variantes';
import type {
  ComparativoMercado,
  ComparativoProduto,
  DadosItemOrcamento,
  ItemComUnitario,
  ItemOrcamento,
} from './types';

const todayIso = (): string => dayjs().format('YYYY-MM-DD');

/** Ordena do registro mais recente para o mais antigo, usando o created_at como desempate. */
const maisRecentePrimeiro = (a: HistoricoPreco, b: HistoricoPreco): number => {
  const diffData = dayjs(b.data).valueOf() - dayjs(a.data).valueOf();
  return diffData !== 0 ? diffData : b.created_at.localeCompare(a.created_at);
};

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

  limpar: () => void;
  registrarPrecos: () => Promise<void>;
};

/** Estado do orcamento e comparacao dos precos entre mercados. */
export function useOrcamento(): UseOrcamento {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [historico, setHistorico] = useState<HistoricoPreco[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const [empresaSelecionada, setEmpresaSelecionada] = useState<string | null>(null);
  const [dataOrcamento, setDataOrcamento] = useState(todayIso());
  const [dataInputKey, setDataInputKey] = useState(0);
  const [itens, setItens] = useState<ItemOrcamento[]>([]);

  const carregarDados = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const [empresasDoBanco, produtosDoBanco, variantesDoBanco, marcasDoBanco, historicoDoBanco] =
        await Promise.all([
          listEmpresas(),
          listProdutos(),
          listProdutoVariantes(),
          listMarcas(),
          listHistoricoPreco(),
        ]);

      setEmpresas(empresasDoBanco);
      setProdutos(produtosDoBanco);
      setVariantes(variantesDoBanco);
      setMarcas(marcasDoBanco);
      setHistorico(historicoDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar dados do orcamento:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar os dados do orcamento');
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
  const comparativoVariantes = useMemo((): ComparativoProduto[] => {
    const porProduto = new Map<string, ItemComUnitario[]>();

    for (const entrada of itensComUnitario) {
      const grupo = porProduto.get(entrada.item.produtoId) ?? [];
      grupo.push(entrada);
      porProduto.set(entrada.item.produtoId, grupo);
    }

    const resultado: ComparativoProduto[] = [];

    for (const [produtoId, entradas] of porProduto) {
      if (entradas.length < 2) {
        continue;
      }

      const comMedida = entradas.filter(
        (
          entrada,
        ): entrada is ItemComUnitario & { unitario: NonNullable<ItemComUnitario['unitario']> } =>
          entrada.unitario !== null,
      );
      const unidadeBase = comMedida[0]?.unitario.unidadeId ?? null;
      const comparavel =
        comMedida.length === entradas.length &&
        unidadeBase !== null &&
        comMedida.every((entrada) => entrada.unitario.unidadeId === unidadeBase);

      const menor = comparavel
        ? Math.min(...comMedida.map((entrada) => entrada.unitario.valor))
        : null;

      resultado.push({
        produtoId,
        nomeProduto: nomeProduto(produtoId),
        comparavel,
        itens: entradas.map((entrada) => ({
          ...entrada,
          maisBarato: comparavel && entrada.unitario !== null && entrada.unitario.valor === menor,
        })),
      });
    }

    return resultado;
  }, [itensComUnitario, nomeProduto]);

  /**
   * Simula o total do orcamento em cada mercado: no mercado selecionado usa os precos
   * digitados agora, nos demais usa o preco mais recente ja registrado no historico.
   */
  const comparativo = useMemo((): ComparativoMercado[] => {
    if (itens.length === 0) {
      return [];
    }

    const idsRelevantes = new Set<string>();

    for (const item of itens) {
      for (const registro of historico) {
        if (registro.variante_id === item.varianteId && registro.empresa_id !== null) {
          idsRelevantes.add(registro.empresa_id);
        }
      }
    }

    if (empresaSelecionada) {
      idsRelevantes.add(empresaSelecionada);
    }

    const resultado: ComparativoMercado[] = [];

    for (const empresaId of idsRelevantes) {
      let total = 0;
      let itensComPreco = 0;

      for (const item of itens) {
        const preco =
          empresaId === empresaSelecionada
            ? item.preco
            : (ultimoPreco(item.varianteId, empresaId)?.preco ?? null);

        if (preco === null) {
          continue;
        }

        total += preco * item.quantidade;
        itensComPreco += 1;
      }

      resultado.push({
        empresaId,
        nome: nomeEmpresa(empresaId),
        total,
        itensComPreco,
        completo: itensComPreco === itens.length,
        mercadoDoOrcamento: empresaId === empresaSelecionada,
      });
    }

    return resultado.sort((a, b) => {
      if (a.completo !== b.completo) {
        return a.completo ? -1 : 1;
      }

      if (a.itensComPreco !== b.itensComPreco) {
        return b.itensComPreco - a.itensComPreco;
      }

      return a.total - b.total;
    });
  }, [itens, historico, empresaSelecionada, ultimoPreco, nomeEmpresa]);

  /** So faz sentido eleger o mais barato entre mercados que cobrem todos os itens. */
  const menorTotalCompleto = useMemo(() => {
    const completos = comparativo.filter((mercado) => mercado.completo);
    return completos.length > 1 ? Math.min(...completos.map((mercado) => mercado.total)) : null;
  }, [comparativo]);

  const alternarEmpresa = useCallback((id: string): void => {
    setEmpresaSelecionada((atual) => (atual === id ? null : id));
  }, []);

  const salvarItem = useCallback(
    (dados: DadosItemOrcamento, index: number | null): boolean => {
      const duplicado = itens.findIndex((item) => item.varianteId === dados.varianteId);

      if (duplicado !== -1 && duplicado !== index) {
        Alert.alert('Erro', 'Esta variante ja esta no orcamento. Edite o item existente.');
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
      Alert.alert('Erro', 'Selecione o mercado onde os precos foram pesquisados');
      return;
    }

    if (!/^\d{4}-\d{2}-\d{2}$/.test(dataOrcamento)) {
      Alert.alert('Erro', 'Informe uma data valida');
      return;
    }

    if (itens.length === 0) {
      Alert.alert('Erro', 'Adicione ao menos um item ao orcamento');
      return;
    }

    try {
      setSalvando(true);

      for (const item of itens) {
        await registrarPrecoVariante({
          produtoId: item.produtoId,
          varianteId: item.varianteId,
          empresaId: empresaSelecionada,
          preco: item.preco,
          data: dataOrcamento,
        });
      }

      const quantidadeRegistrada = itens.length;

      limpar();
      await carregarDados();

      Alert.alert(
        'Precos registrados',
        `${quantidadeRegistrada} preco(s) enviados ao historico de ${nomeEmpresa(
          empresaSelecionada,
        )}. Nenhum lancamento financeiro foi criado.`,
      );
    } catch (error: unknown) {
      console.error('Erro ao registrar precos do orcamento:', error);
      Alert.alert('Erro', 'Nao foi possivel registrar os precos no historico');
    } finally {
      setSalvando(false);
    }
  }, [empresaSelecionada, dataOrcamento, itens, limpar, carregarDados, nomeEmpresa]);

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
    limpar,
    registrarPrecos,
  };
}
