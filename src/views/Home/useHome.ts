import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import {
  type CategoriaLancamento,
  definirCategoriaTransacao,
  listCategoriasLancamento,
} from '../../models/categoriasLancamento';
import { listContasComSaldo, type ContaComSaldo } from '../../models/contas';
import { type ItemTransacao, listItensTransacao } from '../../models/itensTransacao';
import { registrarLancamento } from '../../models/lancamentos';
import {
  excluirTransacao,
  listTransacoes,
  listTransacoesCompra,
  restaurarTransacao,
  resumoCaixa,
  type TransacaoExcluida,
  type Transacoes,
} from '../../models/transacoesModel';
import { materializarPlanos } from '../../models/materializacaoPlanos';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { getLocalPadrao } from '../../models/settingsModel';
import { Locais } from '../../utils/local';
import { agruparPorDia, type GrupoDia } from '../../utils/agruparPorDia';
import { agruparItensPorTransacao } from '../../utils/itensPorTransacao';
import { projetarMes } from '../../utils/projecaoMes';
import type { NovoLancamento } from './types';

dayjs.locale('pt-br');

const hojeIso = (): string => dayjs().format('YYYY-MM-DD');

export type ResumoHome = {
  /** Entradas menos saidas de todo o historico, contando so o que ja aconteceu. */
  saldoAtual: number;
  /** Saidas ja realizadas no mes corrente (positivo). */
  gastoMes: number;
  /** Media diaria de gastos do mes corrente, com base nos dias ja decorridos. */
  mediaDiaria: number;
  /** Parcelas e assinaturas lancadas para o resto do mes (positivo). */
  comprometidoMes: number;
  /** Fechamento previsto do mes: a mesma conta da tela do mes. */
  projecaoMes: number;
  /**
   * Reservas de investimento ativas, com saldo acumulado e meta. Fica fora
   * do saldo disponivel: e dinheiro alocado, nao gasto nem receita.
   */
  reservas: ContaComSaldo[];
  /** Soma dos saldos das reservas. */
  totalReservas: number;
};

/** Um dia da lista de lancamentos, do mais recente para o mais antigo. */
export type SecaoDia = GrupoDia<Transacoes>;

export type UseHome = {
  /** So na primeira carga; depois a tela atualiza sem piscar. */
  loading: boolean;
  /** Puxar para atualizar. */
  atualizando: boolean;
  atualizar: () => void;
  secoes: SecaoDia[];
  resumo: ResumoHome;
  itensPorTransacao: Map<string, ItemTransacao[]>;
  nomeEmpresa: (id?: string | null) => string;
  categorias: CategoriaLancamento[];
  categoriaPorId: (id?: string | null) => CategoriaLancamento | undefined;
  /** Muda a categoria (no plano inteiro, se for parcela ou assinatura). */
  definirCategoria: (transacaoId: string, categoriaId: string | null) => Promise<void>;
  adicionarLancamento: (lancamento: NovoLancamento) => Promise<void>;
  /** Apaga e devolve o que foi apagado, para o "Desfazer". */
  excluir: (id: string) => Promise<TransacaoExcluida | null>;
  restaurar: (excluida: TransacaoExcluida) => Promise<void>;
};

const RESUMO_VAZIO: ResumoHome = {
  saldoAtual: 0,
  gastoMes: 0,
  mediaDiaria: 0,
  comprometidoMes: 0,
  projecaoMes: 0,
  reservas: [],
  totalReservas: 0,
};

/**
 * Concentra o acesso ao banco e os calculos da Home, deixando a tela
 * responsavel apenas pela montagem dos blocos visuais.
 */
export function useHome(): UseHome {
  const [transacoes, setTransacoes] = useState<Transacoes[]>([]);
  const [itens, setItens] = useState<ItemTransacao[]>([]);
  const [compras, setCompras] = useState<Transacoes[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [categorias, setCategorias] = useState<CategoriaLancamento[]>([]);
  const [resumo, setResumo] = useState<ResumoHome>(RESUMO_VAZIO);
  /** Configurado na tela de menu; usado sem perguntar em cada lancamento. */
  const [localPadrao, setLocalPadrao] = useState(Locais.padrao);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  /** A tela so aplica o resultado de uma carga enquanto estiver em foco. */
  const focada = useRef(true);

  const carregarDados = useCallback(async (): Promise<void> => {
    // Antes de ler: as assinaturas do mes corrente precisam existir como linha.
    await materializarPlanos();

    const agora = dayjs();
    const hoje = agora.format('YYYY-MM-DD');
    const inicioMes = agora.startOf('month').format('YYYY-MM-DD');
    // So ate o fim do mes: as parcelas dos meses seguintes aparecem na tela de
    // assinaturas, e nao no feed do dia a dia.
    const fimMes = agora.endOf('month').format('YYYY-MM-DD');

    const [
      transacoesDoBanco,
      transacoesMes,
      caixa,
      itensDoBanco,
      comprasDoBanco,
      empresasDoBanco,
      localPadraoDoBanco,
      categoriasDoBanco,
      contasDoBanco,
    ] = await Promise.all([
      // O feed mostra tambem as compras no cartao: fora do caixa, mas o
      // usuario precisa ve-las para excluir ou categorizar.
      listTransacoes(null, null, { ateData: fimMes, incluirComprasCartao: true }),
      // Com inicio e fim informados a busca nao tem o limite de 50 linhas do
      // feed recente, entao a media e a projecao saem do mes inteiro. Visao
      // de gastos: compra no cartao entra, pagamento de fatura e
      // transferencias entre contas nao.
      listTransacoes(inicioMes, fimMes, { fluxoGastos: true }),
      resumoCaixa(hoje, fimMes),
      listItensTransacao(),
      listTransacoesCompra(),
      listEmpresas(),
      getLocalPadrao(),
      listCategoriasLancamento(),
      listContasComSaldo(),
    ]);

    const projecao = projetarMes(transacoesMes, {
      hoje,
      situacao: 'corrente',
      diasDecorridos: agora.date(),
      diasNoMes: agora.daysInMonth(),
    });

    if (!focada.current) {
      return;
    }

    const reservasAtivas = contasDoBanco.filter((conta) => conta.tipo === 'reserva' && conta.ativo);

    setTransacoes(transacoesDoBanco);
    setItens(itensDoBanco);
    setCompras(comprasDoBanco);
    setEmpresas(empresasDoBanco);
    setLocalPadrao(localPadraoDoBanco);
    setCategorias(categoriasDoBanco);
    setResumo({
      saldoAtual: caixa.saldoAtual,
      gastoMes: projecao.gastoRealizado,
      mediaDiaria: projecao.mediaDiaria,
      comprometidoMes: Math.abs(caixa.comprometido),
      projecaoMes: projecao.projecao,
      reservas: reservasAtivas,
      totalReservas: reservasAtivas.reduce((soma, reserva) => soma + reserva.saldo, 0),
    });
  }, []);

  /**
   * Recarrega a cada vez que a aba ganha foco: lancamentos, assinaturas ou um
   * backup importado em outras telas aparecem aqui sem reiniciar o app.
   */
  useFocusEffect(
    useCallback(() => {
      focada.current = true;

      carregarDados()
        .catch((error: unknown) => console.error('Erro ao carregar a tela inicial', error))
        .finally(() => {
          if (focada.current) {
            setLoading(false);
          }
        });

      return (): void => {
        focada.current = false;
      };
    }, [carregarDados]),
  );

  const atualizar = useCallback((): void => {
    setAtualizando(true);
    carregarDados()
      .catch((error: unknown) => console.error('Erro ao atualizar a tela inicial', error))
      .finally(() => setAtualizando(false));
  }, [carregarDados]);

  const secoes = useMemo((): SecaoDia[] => agruparPorDia(transacoes), [transacoes]);

  const itensPorTransacao = useMemo(
    () => agruparItensPorTransacao(itens, compras, transacoes),
    [itens, compras, transacoes],
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

  const definirCategoria = useCallback(
    async (transacaoId: string, categoriaId: string | null): Promise<void> => {
      await definirCategoriaTransacao(transacaoId, categoriaId);
      await carregarDados();
    },
    [carregarDados],
  );

  const adicionarLancamento = useCallback(
    async (lancamento: NovoLancamento): Promise<void> => {
      await registrarLancamento(lancamento, localPadrao);
      await carregarDados();
    },
    [carregarDados, localPadrao],
  );

  const excluir = useCallback(
    async (id: string): Promise<TransacaoExcluida | null> => {
      const excluida = await excluirTransacao(id);
      await carregarDados();
      return excluida;
    },
    [carregarDados],
  );

  const restaurar = useCallback(
    async (excluida: TransacaoExcluida): Promise<void> => {
      await restaurarTransacao(excluida);
      await carregarDados();
    },
    [carregarDados],
  );

  return {
    loading,
    atualizando,
    atualizar,
    secoes,
    resumo,
    itensPorTransacao,
    nomeEmpresa,
    categorias,
    categoriaPorId,
    definirCategoria,
    adicionarLancamento,
    excluir,
    restaurar,
  };
}

/** `true` quando a data (YYYY-MM-DD) ainda nao chegou. */
export const ehFuturo = (data: string): boolean => data > hojeIso();
