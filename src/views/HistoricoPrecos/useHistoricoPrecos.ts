import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { type HistoricoPreco, listHistoricoPreco } from '../../models/historicoPreco';
import { listMarcas, type Marca } from '../../models/marcas';
import { listProdutos, type Produto } from '../../models/produtos';
import { listProdutoVariantes, type ProdutoVariantes } from '../../models/produtoVariantes';
import { precoPorUnidadePrimaria, rotuloVariantePorId } from '../../utils/variantes';
import { definirBaseComparacao, normalizarGrupo, valorComparavel } from './normalizacao';
import type { Agrupamento, BaseComparacao, GrupoPreco, Ordenacao, RegistroPreco } from './types';

const toTimestamp = (data: string): number => dayjs(data).valueOf();

export type UseHistoricoPrecos = {
  loading: boolean;
  produtos: Produto[];
  grupos: GrupoPreco[];
  /** Escala em que os grupos estao sendo comparados entre si. */
  baseComparacao: BaseComparacao;
  /** `true` no grupo com o menor preco atual; sempre `false` com menos de dois grupos. */
  ehMelhorPreco: (grupo: GrupoPreco) => boolean;
  produtoFiltro: string | null;
  alternarProdutoFiltro: (id: string) => void;
  /** Variante isolada pela leitura do codigo de barras; `null` quando sem filtro. */
  varianteFiltro: string | null;
  /** Codigo de barras lido, mantido apenas para exibir o filtro ativo. */
  codigoFiltro: string | null;
  filtrarPorCodigoBarras: (codigo: string) => void;
  limparFiltroCodigo: () => void;
  agrupamento: Agrupamento;
  trocarAgrupamento: (valor: Agrupamento) => void;
  ordenacao: Ordenacao;
  setOrdenacao: (valor: Ordenacao) => void;
  expandidos: string[];
  alternarExpandido: (chave: string) => void;
  nomeEmpresa: (id: string | null) => string;
  rotuloVariante: (varianteId: string) => string;
};

/** Carrega o historico e agrupa os precos conforme os filtros da tela. */
export function useHistoricoPrecos(): UseHistoricoPrecos {
  const [historico, setHistorico] = useState<HistoricoPreco[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [variantes, setVariantes] = useState<ProdutoVariantes[]>([]);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);

  const [produtoFiltro, setProdutoFiltro] = useState<string | null>(null);
  const [varianteFiltro, setVarianteFiltro] = useState<string | null>(null);
  const [codigoFiltro, setCodigoFiltro] = useState<string | null>(null);
  const [agrupamento, setAgrupamento] = useState<Agrupamento>('variante');
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('menorPreco');
  const [expandidos, setExpandidos] = useState<string[]>([]);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const [historicoDoBanco, produtosDoBanco, variantesDoBanco, marcasDoBanco, empresasDoBanco] =
        await Promise.all([
          listHistoricoPreco(),
          listProdutos(),
          listProdutoVariantes(),
          listMarcas(),
          listEmpresas(),
        ]);

      setHistorico(historicoDoBanco);
      setProdutos(produtosDoBanco);
      setVariantes(variantesDoBanco);
      setMarcas(marcasDoBanco);
      setEmpresas(empresasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar historico de precos:', error);
      Alert.alert('Erro', 'Não foi possível carregar o histórico de preços');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const nomeProduto = useCallback(
    (id: string): string =>
      produtos.find((produto) => produto.id === id)?.nome ?? 'Produto removido',
    [produtos],
  );

  const nomeEmpresa = useCallback(
    (id: string | null): string =>
      empresas.find((empresa) => empresa.id === id)?.nome ?? 'Sem empresa',
    [empresas],
  );

  const rotuloVariante = useCallback(
    (varianteId: string): string => rotuloVariantePorId(varianteId, variantes, marcas),
    [variantes, marcas],
  );

  const { grupos, baseComparacao } = useMemo((): {
    grupos: GrupoPreco[];
    baseComparacao: BaseComparacao;
  } => {
    const variantePorId = new Map(variantes.map((variante) => [variante.id, variante]));

    const filtrado = historico.filter((registro) => {
      if (produtoFiltro && registro.produto_id !== produtoFiltro) {
        return false;
      }

      return !varianteFiltro || registro.variante_id === varianteFiltro;
    });

    const agrupado = new Map<string, HistoricoPreco[]>();

    for (const registro of filtrado) {
      const chave = agrupamento === 'variante' ? registro.variante_id : registro.produto_id;
      const atuais = agrupado.get(chave) ?? [];
      atuais.push(registro);
      agrupado.set(chave, atuais);
    }

    const resultado: GrupoPreco[] = [];

    for (const [chave, registrosDoGrupo] of agrupado) {
      const ordenados = [...registrosDoGrupo].sort(
        (a, b) => toTimestamp(b.data) - toTimestamp(a.data),
      );
      const registros: RegistroPreco[] = ordenados.map((registro) => ({
        registro,
        unitario: precoPorUnidadePrimaria(registro.preco, variantePorId.get(registro.variante_id)),
      }));

      const precos = ordenados.map((registro) => registro.preco);
      const menor = Math.min(...precos);
      const registroMenor = ordenados.find((registro) => registro.preco === menor) ?? ordenados[0];
      const produtoDoGrupo = ordenados[0].produto_id;

      resultado.push({
        chave,
        titulo: agrupamento === 'variante' ? rotuloVariante(chave) : nomeProduto(produtoDoGrupo),
        subtitulo:
          agrupamento === 'variante'
            ? nomeProduto(produtoDoGrupo)
            : `${registros.length} registro(s) de preço`,
        registros,
        atual: ordenados[0].preco,
        menor,
        maior: Math.max(...precos),
        media: precos.reduce((soma, preco) => soma + preco, 0) / precos.length,
        registroMenor,
        registroAtual: ordenados[0],
        normalizado: normalizarGrupo(registros),
      });
    }

    const base = definirBaseComparacao(resultado);

    resultado.sort((a, b) => {
      if (ordenacao === 'menorPreco') {
        return valorComparavel(a, base) - valorComparavel(b, base);
      }

      if (ordenacao === 'recente') {
        return toTimestamp(b.registroAtual.data) - toTimestamp(a.registroAtual.data);
      }

      return a.titulo.localeCompare(b.titulo, 'pt-BR');
    });

    return { grupos: resultado, baseComparacao: base };
  }, [
    historico,
    variantes,
    nomeProduto,
    rotuloVariante,
    produtoFiltro,
    varianteFiltro,
    agrupamento,
    ordenacao,
  ]);

  const melhorPreco = useMemo(
    () =>
      grupos.length > 1
        ? Math.min(...grupos.map((grupo) => valorComparavel(grupo, baseComparacao)))
        : null,
    [grupos, baseComparacao],
  );

  const ehMelhorPreco = useCallback(
    (grupo: GrupoPreco): boolean =>
      melhorPreco !== null && valorComparavel(grupo, baseComparacao) === melhorPreco,
    [melhorPreco, baseComparacao],
  );

  const alternarExpandido = useCallback((chave: string): void => {
    setExpandidos((atuais) =>
      atuais.includes(chave) ? atuais.filter((item) => item !== chave) : [...atuais, chave],
    );
  }, []);

  const limparFiltroCodigo = useCallback((): void => {
    setVarianteFiltro(null);
    setCodigoFiltro(null);
    setExpandidos([]);
  }, []);

  const alternarProdutoFiltro = useCallback((id: string): void => {
    setProdutoFiltro((atual) => (atual === id ? null : id));
    setVarianteFiltro(null);
    setCodigoFiltro(null);
    setExpandidos([]);
  }, []);

  const trocarAgrupamento = useCallback((valor: Agrupamento): void => {
    setAgrupamento(valor);
    setVarianteFiltro(null);
    setCodigoFiltro(null);
    setExpandidos([]);
  }, []);

  /**
   * Aplica o filtro a partir do codigo de barras da variante: comparando por
   * produto usa o `produto_id` dela, comparando por variante isola a propria.
   */
  const filtrarPorCodigoBarras = useCallback(
    (codigo: string): void => {
      const codigoLimpo = codigo.trim();

      if (!codigoLimpo) {
        return;
      }

      const variante = variantes.find((item) => (item.codigo_barras ?? '').trim() === codigoLimpo);

      if (!variante) {
        Alert.alert(
          'Código não encontrado',
          `Nenhuma variante cadastrada com o código ${codigoLimpo}`,
        );
        return;
      }

      setProdutoFiltro(variante.produto_id);
      setVarianteFiltro(agrupamento === 'variante' ? variante.id : null);
      setCodigoFiltro(codigoLimpo);
      setExpandidos([]);
    },
    [variantes, agrupamento],
  );

  return {
    loading,
    produtos,
    grupos,
    baseComparacao,
    ehMelhorPreco,
    produtoFiltro,
    alternarProdutoFiltro,
    varianteFiltro,
    codigoFiltro,
    filtrarPorCodigoBarras,
    limparFiltroCodigo,
    agrupamento,
    trocarAgrupamento,
    ordenacao,
    setOrdenacao,
    expandidos,
    alternarExpandido,
    nomeEmpresa,
    rotuloVariante,
  };
}
