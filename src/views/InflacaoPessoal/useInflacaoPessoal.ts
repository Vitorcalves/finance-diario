import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { listComprasDeVariantes } from '../../models/dashboard';
import { listHistoricoPreco } from '../../models/historicoPreco';
import { listMarcas, type Marca } from '../../models/marcas';
import { listProdutos, type Produto } from '../../models/produtos';
import { listProdutoVariantes, type ProdutoVariantes } from '../../models/produtoVariantes';
import {
  calcularInflacao,
  type CompraDoItem,
  type InflacaoPessoal,
  type MesInflacao,
  type PrecoDoItem,
} from '../../utils/inflacaoPessoal';
import { rotuloVariante } from '../../utils/variantes';
import type { ItemDaCesta, ModoGrafico, PeriodoInflacao } from './types';

/** Quantos meses cada periodo mostra; `null` = todo o historico. */
const MESES_DO_PERIODO: Record<PeriodoInflacao, number | null> = {
  '6': 6,
  '12': 12,
  tudo: null,
};

type Dados = {
  precos: PrecoDoItem[];
  compras: CompraDoItem[];
  produtos: Produto[];
  variantes: ProdutoVariantes[];
  marcas: Marca[];
};

export type UseInflacaoPessoal = {
  /** So na primeira carga; voltar para a tela le os dados de novo sem piscar. */
  loading: boolean;
  periodo: PeriodoInflacao;
  trocarPeriodo: (periodo: PeriodoInflacao) => void;
  modo: ModoGrafico;
  trocarModo: (modo: ModoGrafico) => void;
  inflacao: InflacaoPessoal;
  /** Itens da cesta no periodo, com nome, do maior impacto ao menor. */
  itens: ItemDaCesta[];
  /** Mes detalhado abaixo do grafico: o tocado ou, sem toque, o mais recente. */
  mesDestaque: MesInflacao | null;
  selecionarMes: (mes: string) => void;
};

/** Carrega o historico de precos e as compras e calcula a inflacao da cesta. */
export function useInflacaoPessoal(): UseInflacaoPessoal {
  const [dados, setDados] = useState<Dados | null>(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<PeriodoInflacao>('12');
  const [modo, setModo] = useState<ModoGrafico>('mensal');
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      void (async (): Promise<void> => {
        try {
          const [historico, compras, produtos, variantes, marcas] = await Promise.all([
            listHistoricoPreco(),
            listComprasDeVariantes(),
            listProdutos(),
            listProdutoVariantes(),
            listMarcas(),
          ]);

          if (!ativo) {
            return;
          }

          setDados({
            precos: historico.map((registro) => ({
              itemId: registro.variante_id,
              data: registro.data,
              preco: registro.preco,
            })),
            compras: compras.map((compra) => ({
              itemId: compra.variante_id,
              data: compra.data,
              total: compra.total,
            })),
            produtos,
            variantes,
            marcas,
          });
        } catch (error: unknown) {
          console.error('Erro ao carregar a inflacao pessoal:', error);
          Alert.alert('Erro', 'Não foi possível carregar a inflação pessoal');
        } finally {
          if (ativo) {
            setLoading(false);
          }
        }
      })();

      return (): void => {
        ativo = false;
      };
    }, []),
  );

  // O mes em andamento entra: as compras dele ja mostram para onde a cesta vai.
  const mesFinal = dayjs().format('YYYY-MM');

  const inflacao = useMemo(
    (): InflacaoPessoal =>
      calcularInflacao(dados?.precos ?? [], dados?.compras ?? [], {
        mesFinal,
        meses: MESES_DO_PERIODO[periodo],
      }),
    [dados, mesFinal, periodo],
  );

  const itens = useMemo((): ItemDaCesta[] => {
    const variantes = new Map((dados?.variantes ?? []).map((variante) => [variante.id, variante]));
    const produtos = new Map((dados?.produtos ?? []).map((produto) => [produto.id, produto.nome]));
    const marcas = dados?.marcas ?? [];

    return inflacao.itens.map((item) => {
      const variante = variantes.get(item.itemId);

      return {
        ...item,
        produtoId: variante?.produto_id ?? null,
        nome: (variante && produtos.get(variante.produto_id)) ?? 'Produto removido',
        variante: variante ? rotuloVariante(variante, marcas) : 'Variante removida',
      };
    });
  }, [inflacao.itens, dados]);

  const mesDestaque = useMemo(
    (): MesInflacao | null =>
      inflacao.meses.find((mes) => mes.mes === mesSelecionado) ?? inflacao.meses.at(-1) ?? null,
    [inflacao.meses, mesSelecionado],
  );

  const trocarPeriodo = useCallback((novo: PeriodoInflacao): void => {
    setPeriodo(novo);
    // O mes tocado pode nao existir no periodo novo: volta para o mais recente.
    setMesSelecionado(null);
  }, []);

  return {
    loading,
    periodo,
    trocarPeriodo,
    modo,
    trocarModo: setModo,
    inflacao,
    itens,
    mesDestaque,
    selecionarMes: setMesSelecionado,
  };
}
