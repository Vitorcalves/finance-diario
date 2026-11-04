import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import {
  type CategoriaLancamento,
  definirCategoriaTransacao,
  listCategoriasLancamento,
} from '../../models/categoriasLancamento';
import { type Conta, listContas } from '../../models/contas';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { type ItemTransacao, listItensTransacao } from '../../models/itensTransacao';
import {
  buscarTransacoes,
  excluirTransacao,
  listTransacoesCompra,
  restaurarTransacao,
  type TransacaoBuscada,
  type TransacaoExcluida,
  type Transacoes,
} from '../../models/transacoesModel';
import type { FiltrosIniciaisBusca } from '../../routes/types';
import { agruparPorDia, type GrupoDia } from '../../utils/agruparPorDia';
import { filtrarPorTexto } from '../../utils/busca';
import { agruparItensPorTransacao } from '../../utils/itensPorTransacao';
import { type Intervalo, intervaloDoPeriodo, type PeriodoBusca } from '../../utils/periodos';

export type TipoFiltro = 'todos' | 'saida' | 'entrada';

/** Espera depois da ultima tecla antes de filtrar, para nao refazer a lista a cada letra. */
const ESPERA_DIGITACAO = 250;

export type TotaisBusca = {
  quantidade: number;
  /** Soma das saidas encontradas (positivo). */
  saidas: number;
  entradas: number;
};

export type UseBuscaLancamentos = {
  loading: boolean;
  termo: string;
  setTermo: (termo: string) => void;
  periodo: PeriodoBusca;
  setPeriodo: (periodo: PeriodoBusca) => void;
  personalizado: Intervalo;
  setPersonalizado: (intervalo: Intervalo) => void;
  tipo: TipoFiltro;
  setTipo: (tipo: TipoFiltro) => void;
  categoriaId: string | null;
  setCategoriaId: (id: string | null) => void;
  empresaId: string | null;
  setEmpresaId: (id: string | null) => void;
  contaId: string | null;
  setContaId: (id: string | null) => void;
  /** Algum filtro alem do periodo padrao esta ativo. */
  filtrosAtivos: boolean;
  limparFiltros: () => void;
  secoes: GrupoDia<TransacaoBuscada>[];
  totais: TotaisBusca;
  empresas: Empresa[];
  categorias: CategoriaLancamento[];
  contas: Conta[];
  itensPorTransacao: Map<string, ItemTransacao[]>;
  nomeEmpresa: (id?: string | null) => string;
  categoriaPorId: (id?: string | null) => CategoriaLancamento | undefined;
  excluir: (id: string) => Promise<TransacaoExcluida | null>;
  restaurar: (excluida: TransacaoExcluida) => Promise<void>;
  definirCategoria: (transacaoId: string, categoriaId: string | null) => Promise<void>;
};

/** Busca por texto e filtros em todo o historico de lancamentos. */
export function useBuscaLancamentos(iniciais?: FiltrosIniciaisBusca): UseBuscaLancamentos {
  const comPeriodoInicial = Boolean(iniciais?.inicio || iniciais?.fim);

  const [termo, setTermo] = useState('');
  const [termoAplicado, setTermoAplicado] = useState('');
  const [periodo, setPeriodo] = useState<PeriodoBusca>(
    comPeriodoInicial ? 'personalizado' : 'tudo',
  );
  const [personalizado, setPersonalizado] = useState<Intervalo>({
    inicio: iniciais?.inicio ?? null,
    fim: iniciais?.fim ?? null,
  });
  const [tipo, setTipo] = useState<TipoFiltro>('todos');
  const [categoriaId, setCategoriaId] = useState<string | null>(iniciais?.categoriaId ?? null);
  const [empresaId, setEmpresaId] = useState<string | null>(iniciais?.empresaId ?? null);
  const [contaId, setContaId] = useState<string | null>(null);

  const [resultados, setResultados] = useState<TransacaoBuscada[]>([]);
  const [itens, setItens] = useState<ItemTransacao[]>([]);
  const [compras, setCompras] = useState<Transacoes[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [categorias, setCategorias] = useState<CategoriaLancamento[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  /** So o resultado da busca mais recente entra na tela. */
  const ultimaBusca = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => setTermoAplicado(termo), ESPERA_DIGITACAO);
    return (): void => clearTimeout(timer);
  }, [termo]);

  const intervalo = useMemo(
    () => intervaloDoPeriodo(periodo, dayjs().format('YYYY-MM-DD'), personalizado),
    [periodo, personalizado],
  );

  const carregar = useCallback(async (): Promise<void> => {
    const busca = ultimaBusca.current + 1;
    ultimaBusca.current = busca;

    const [
      encontrados,
      itensDoBanco,
      comprasDoBanco,
      empresasDoBanco,
      categoriasDoBanco,
      contasDoBanco,
    ] = await Promise.all([
      buscarTransacoes({
        inicio: intervalo.inicio,
        fim: intervalo.fim,
        empresaId,
        categoriaId,
        tipo: tipo === 'todos' ? null : tipo,
        contaId,
      }),
      listItensTransacao(),
      listTransacoesCompra(),
      listEmpresas(),
      listCategoriasLancamento(),
      listContas(),
    ]);

    if (ultimaBusca.current !== busca) {
      return;
    }

    setResultados(encontrados);
    setItens(itensDoBanco);
    setCompras(comprasDoBanco);
    setEmpresas(empresasDoBanco);
    setCategorias(categoriasDoBanco);
    setContas(contasDoBanco);
  }, [intervalo, empresaId, categoriaId, tipo, contaId]);

  // Recarrega ao voltar para a tela e sempre que um filtro do banco muda.
  useFocusEffect(
    useCallback(() => {
      carregar()
        .catch((error: unknown) => console.error('Erro ao buscar lancamentos', error))
        .finally(() => setLoading(false));
    }, [carregar]),
  );

  const nomesEmpresas = useMemo(
    () => new Map(empresas.map((empresa) => [empresa.id, empresa.nome])),
    [empresas],
  );

  const nomeEmpresa = useCallback(
    (id?: string | null): string => (id ? (nomesEmpresas.get(id) ?? '') : ''),
    [nomesEmpresas],
  );

  const categoriasPorId = useMemo(
    () => new Map(categorias.map((categoria) => [categoria.id, categoria])),
    [categorias],
  );

  const categoriaPorId = useCallback(
    (id?: string | null): CategoriaLancamento | undefined =>
      id ? categoriasPorId.get(id) : undefined,
    [categoriasPorId],
  );

  const filtrados = useMemo(
    () => filtrarPorTexto(resultados, termoAplicado, nomeEmpresa),
    [resultados, termoAplicado, nomeEmpresa],
  );

  const secoes = useMemo(() => agruparPorDia(filtrados), [filtrados]);

  const totais = useMemo(
    (): TotaisBusca =>
      filtrados.reduce(
        (soma, transacao) => ({
          quantidade: soma.quantidade + 1,
          saidas: soma.saidas + (transacao.valor < 0 ? Math.abs(transacao.valor) : 0),
          entradas: soma.entradas + (transacao.valor > 0 ? transacao.valor : 0),
        }),
        { quantidade: 0, saidas: 0, entradas: 0 },
      ),
    [filtrados],
  );

  const itensPorTransacao = useMemo(
    () => agruparItensPorTransacao(itens, compras, filtrados),
    [itens, compras, filtrados],
  );

  const limparFiltros = useCallback((): void => {
    setTermo('');
    setPeriodo('tudo');
    setPersonalizado({ inicio: null, fim: null });
    setTipo('todos');
    setCategoriaId(null);
    setEmpresaId(null);
    setContaId(null);
  }, []);

  const excluir = useCallback(
    async (id: string): Promise<TransacaoExcluida | null> => {
      const excluida = await excluirTransacao(id);
      await carregar();
      return excluida;
    },
    [carregar],
  );

  const restaurar = useCallback(
    async (excluida: TransacaoExcluida): Promise<void> => {
      await restaurarTransacao(excluida);
      await carregar();
    },
    [carregar],
  );

  const definirCategoria = useCallback(
    async (transacaoId: string, novaCategoria: string | null): Promise<void> => {
      await definirCategoriaTransacao(transacaoId, novaCategoria);
      await carregar();
    },
    [carregar],
  );

  return {
    loading,
    termo,
    setTermo,
    periodo,
    setPeriodo,
    personalizado,
    setPersonalizado,
    tipo,
    setTipo,
    categoriaId,
    setCategoriaId,
    empresaId,
    setEmpresaId,
    contaId,
    setContaId,
    filtrosAtivos:
      termo.trim() !== '' ||
      periodo !== 'tudo' ||
      tipo !== 'todos' ||
      categoriaId !== null ||
      empresaId !== null ||
      contaId !== null,
    limparFiltros,
    secoes,
    totais,
    empresas,
    categorias,
    contas,
    itensPorTransacao,
    nomeEmpresa,
    categoriaPorId,
    excluir,
    restaurar,
    definirCategoria,
  };
}
