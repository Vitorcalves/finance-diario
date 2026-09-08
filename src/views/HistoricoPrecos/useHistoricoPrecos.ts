import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { type HistoricoPreco, listHistoricoPreco } from '../../models/historicoPreco';
import { listMarcas, type Marca } from '../../models/marcas';
import { listProdutos, type Produto } from '../../models/produtos';
import { listProdutoVariantes, type ProdutoVariantes } from '../../models/produtoVariantes';
import { rotuloVariantePorId } from '../../utils/variantes';
import type { Agrupamento, GrupoPreco, Ordenacao } from './types';

const toTimestamp = (data: string): number => dayjs(data).valueOf();

export type UseHistoricoPrecos = {
  loading: boolean;
  produtos: Produto[];
  grupos: GrupoPreco[];
  /** Menor preco atual entre os grupos; `null` quando ha menos de dois. */
  melhorPreco: number | null;
  produtoFiltro: string | null;
  alternarProdutoFiltro: (id: string) => void;
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
      Alert.alert('Erro', 'Nao foi possivel carregar o historico de precos');
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

  const grupos = useMemo((): GrupoPreco[] => {
    const filtrado = produtoFiltro
      ? historico.filter((registro) => registro.produto_id === produtoFiltro)
      : historico;

    const agrupado = new Map<string, HistoricoPreco[]>();

    for (const registro of filtrado) {
      const chave = agrupamento === 'variante' ? registro.variante_id : registro.produto_id;
      const atuais = agrupado.get(chave) ?? [];
      atuais.push(registro);
      agrupado.set(chave, atuais);
    }

    const resultado: GrupoPreco[] = [];

    for (const [chave, registrosDoGrupo] of agrupado) {
      const registros = [...registrosDoGrupo].sort(
        (a, b) => toTimestamp(b.data) - toTimestamp(a.data),
      );
      const precos = registros.map((registro) => registro.preco);
      const menor = Math.min(...precos);
      const registroMenor = registros.find((registro) => registro.preco === menor) ?? registros[0];
      const produtoDoGrupo = registros[0].produto_id;

      resultado.push({
        chave,
        titulo: agrupamento === 'variante' ? rotuloVariante(chave) : nomeProduto(produtoDoGrupo),
        subtitulo:
          agrupamento === 'variante'
            ? nomeProduto(produtoDoGrupo)
            : `${registros.length} registro(s) de preco`,
        registros,
        atual: registros[0].preco,
        menor,
        maior: Math.max(...precos),
        media: precos.reduce((soma, preco) => soma + preco, 0) / precos.length,
        registroMenor,
        registroAtual: registros[0],
      });
    }

    return resultado.sort((a, b) => {
      if (ordenacao === 'menorPreco') {
        return a.atual - b.atual;
      }

      if (ordenacao === 'recente') {
        return toTimestamp(b.registroAtual.data) - toTimestamp(a.registroAtual.data);
      }

      return a.titulo.localeCompare(b.titulo, 'pt-BR');
    });
  }, [historico, nomeProduto, rotuloVariante, produtoFiltro, agrupamento, ordenacao]);

  const melhorPreco = useMemo(
    () => (grupos.length > 1 ? Math.min(...grupos.map((grupo) => grupo.atual)) : null),
    [grupos],
  );

  const alternarExpandido = useCallback((chave: string): void => {
    setExpandidos((atuais) =>
      atuais.includes(chave) ? atuais.filter((item) => item !== chave) : [...atuais, chave],
    );
  }, []);

  const alternarProdutoFiltro = useCallback((id: string): void => {
    setProdutoFiltro((atual) => (atual === id ? null : id));
    setExpandidos([]);
  }, []);

  const trocarAgrupamento = useCallback((valor: Agrupamento): void => {
    setAgrupamento(valor);
    setExpandidos([]);
  }, []);

  return {
    loading,
    produtos,
    grupos,
    melhorPreco,
    produtoFiltro,
    alternarProdutoFiltro,
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
