import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import {
  listHistoricoPorProduto,
  listPrecosPagosPorProduto,
  listProdutosComMovimento,
  type PrecoHistorico,
  type PrecoPago,
  type ProdutoComMovimento,
} from '../../models/dashboard';
import { listMarcas, type Marca } from '../../models/marcas';
import { listProdutoVariantes, type ProdutoVariantes } from '../../models/produtoVariantes';
import { precoPorUnidadePrimaria, rotuloVariantePorId } from '../../utils/variantes';
import { agruparPorDia, definirUnidadeBase, resumirPrecos, valoresNaBase } from './series';
import type { RegistroUnitario, ResumoPrecos, Serie, UnidadeBase } from './types';

export type UseAnalisePrecos = {
  loading: boolean;
  /** `true` enquanto as series do produto escolhido estao sendo lidas. */
  carregandoSeries: boolean;
  produtos: ProdutoComMovimento[];
  produtoId: string | null;
  selecionarProduto: (id: string) => void;
  /** Variantes que aparecem nas compras ou no historico do produto. */
  variantes: { id: string; rotulo: string }[];
  /** `null` mostra todas as variantes juntas. */
  varianteId: string | null;
  selecionarVariante: (id: string | null) => void;
  /** Unidade base comum aos precos do filtro; so com `ok` da para ver R$/kg. */
  unidadeBase: UnidadeBase;
  /** Escolha do usuario: preco por unidade base em vez do preco do produto. */
  porUnidade: boolean;
  alternarPorUnidade: () => void;
  /** Sigla em que os valores estao expressos (`kg`); `null` = preco do produto. */
  sigla: string | null;
  series: Serie[];
  resumo: ResumoPrecos;
};

/** Carrega precos pagos e historico do produto escolhido e monta as duas series. */
export function useAnalisePrecos(produtoInicial?: string): UseAnalisePrecos {
  const [loading, setLoading] = useState(true);
  const [carregandoSeries, setCarregandoSeries] = useState(false);
  const [produtos, setProdutos] = useState<ProdutoComMovimento[]>([]);
  const [variantesCadastro, setVariantesCadastro] = useState<ProdutoVariantes[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [produtoId, setProdutoId] = useState<string | null>(produtoInicial ?? null);
  const [varianteId, setVarianteId] = useState<string | null>(null);
  // Fica ligado ao trocar de produto: quem compara por kg quer comparar todos assim.
  const [porUnidade, setPorUnidade] = useState(false);
  // Series guardadas junto com o produto a que pertencem: ao trocar de produto
  // o dado antigo e ignorado ate a nova leitura chegar, sem precisar zerar
  // estado dentro do efeito.
  const [carregado, setCarregado] = useState<{
    produtoId: string;
    pagos: PrecoPago[];
    historico: PrecoHistorico[];
  } | null>(null);

  const carregarCatalogo = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const [produtosDoBanco, variantesDoBanco, marcasDoBanco] = await Promise.all([
        listProdutosComMovimento(),
        listProdutoVariantes(),
        listMarcas(),
      ]);

      setProdutos(produtosDoBanco);
      setVariantesCadastro(variantesDoBanco);
      setMarcas(marcasDoBanco);

      // Sem produto escolhido (ou com um que sumiu) cai no mais movimentado.
      setProdutoId((atual) =>
        atual && produtosDoBanco.some((produto) => produto.id === atual)
          ? atual
          : (produtosDoBanco[0]?.id ?? null),
      );
    } catch (error: unknown) {
      console.error('Erro ao carregar produtos do dashboard:', error);
      Alert.alert('Erro', 'Não foi possível carregar os produtos');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregarCatalogo();
    }, [carregarCatalogo]),
  );

  useEffect(() => {
    if (!produtoId) {
      return;
    }

    let ativo = true;

    void (async (): Promise<void> => {
      try {
        setCarregandoSeries(true);
        const [pagosDoBanco, historicoDoBanco] = await Promise.all([
          listPrecosPagosPorProduto(produtoId),
          listHistoricoPorProduto(produtoId),
        ]);

        if (ativo) {
          setCarregado({ produtoId, pagos: pagosDoBanco, historico: historicoDoBanco });
        }
      } catch (error: unknown) {
        console.error('Erro ao carregar series de preco:', error);
        Alert.alert('Erro', 'Não foi possível carregar os preços do produto');
      } finally {
        if (ativo) {
          setCarregandoSeries(false);
        }
      }
    })();

    return (): void => {
      ativo = false;
    };
  }, [produtoId]);

  const selecionarProduto = useCallback((id: string): void => {
    setProdutoId(id);
    setVarianteId(null);
  }, []);

  const pagos = useMemo(
    (): PrecoPago[] => (carregado?.produtoId === produtoId ? carregado.pagos : []),
    [carregado, produtoId],
  );
  const historico = useMemo(
    (): PrecoHistorico[] => (carregado?.produtoId === produtoId ? carregado.historico : []),
    [carregado, produtoId],
  );

  const variantes = useMemo(() => {
    const ids = new Set<string>();

    for (const pago of pagos) {
      if (pago.variante_id) {
        ids.add(pago.variante_id);
      }
    }

    for (const registro of historico) {
      ids.add(registro.variante_id);
    }

    return [...ids]
      .map((id) => ({ id, rotulo: rotuloVariantePorId(id, variantesCadastro, marcas) }))
      .sort((a, b) => a.rotulo.localeCompare(b.rotulo, 'pt-BR'));
  }, [pagos, historico, variantesCadastro, marcas]);

  const variantePorId = useMemo(
    () => new Map(variantesCadastro.map((variante) => [variante.id, variante])),
    [variantesCadastro],
  );

  /** Registros do filtro, cada um tambem com o preco reduzido a unidade base. */
  const registros = useMemo(() => {
    const daVariante = <T extends { variante_id: string | null }>(lista: T[]): T[] =>
      varianteId ? lista.filter((registro) => registro.variante_id === varianteId) : lista;

    const comUnitario = (registro: PrecoPago | PrecoHistorico): RegistroUnitario => ({
      data: registro.data,
      preco: registro.preco,
      unitario: precoPorUnidadePrimaria(
        registro.preco,
        registro.variante_id ? variantePorId.get(registro.variante_id) : undefined,
      ),
    });

    return {
      pagos: daVariante(pagos).map(comUnitario),
      historico: daVariante(historico).map(comUnitario),
    };
  }, [pagos, historico, varianteId, variantePorId]);

  const unidadeBase = useMemo(
    (): UnidadeBase => definirUnidadeBase([...registros.pagos, ...registros.historico]),
    [registros],
  );

  // Sem base comum (sem medida ou kg x un) a escolha fica guardada, mas os
  // valores voltam para o preco do produto.
  const sigla = porUnidade && unidadeBase.status === 'ok' ? unidadeBase.sigla : null;

  const series = useMemo((): Serie[] => {
    const naBase = sigla !== null;

    return [
      {
        id: 'historico',
        rotulo: 'Histórico de preços',
        pontos: agruparPorDia(valoresNaBase(registros.historico, naBase)),
      },
      {
        id: 'pago',
        rotulo: 'Valor pago',
        pontos: agruparPorDia(valoresNaBase(registros.pagos, naBase)),
      },
    ];
  }, [registros, sigla]);

  const alternarPorUnidade = useCallback((): void => {
    setPorUnidade((atual) => !atual);
  }, []);

  const resumo = useMemo(
    (): ResumoPrecos =>
      resumirPrecos(
        series.find((serie) => serie.id === 'pago')?.pontos ?? [],
        series.find((serie) => serie.id === 'historico')?.pontos ?? [],
      ),
    [series],
  );

  return {
    loading,
    carregandoSeries,
    produtos,
    produtoId,
    selecionarProduto,
    variantes,
    varianteId,
    selecionarVariante: setVarianteId,
    unidadeBase,
    porUnidade,
    alternarPorUnidade,
    sigla,
    series,
    resumo,
  };
}
