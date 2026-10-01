import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { v4 as uuid4 } from 'uuid';
import { emTransacao } from '../../models/database';
import {
  insertItemTransacao,
  type ItemTransacao,
  listItensTransacao,
} from '../../models/itensTransacao';
import {
  excluirTransacao,
  insertTransacao,
  listTransacoes,
  listTransacoesCompra,
  restaurarTransacao,
  resumoCaixa,
  type TransacaoExcluida,
  type Transacoes,
} from '../../models/transacoesModel';
import { criarCompraParcelada, materializarPlanos } from '../../models/materializacaoPlanos';
import { registrarPrecoVariante } from '../../models/produtoVariantes';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { getLocalPadrao } from '../../models/settingsModel';
import { Locais } from '../../utils/local';
import { projetarMes } from '../../utils/projecaoMes';
import type { NovoLancamento } from './types';

dayjs.locale('pt-br');

/** Data com hora local, para o historico de precos ser exibido no dia correto. */
const toDataHistorico = (data: string): string => dayjs(data).format('YYYY-MM-DDTHH:mm:ss');

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
};

/** Um dia da lista de lancamentos, do mais recente para o mais antigo. */
export type SecaoDia = {
  /** YYYY-MM-DD. */
  dia: string;
  /** Soma com sinal dos lancamentos do dia. */
  total: number;
  /** Lancamentos do dia (o nome `data` e o que a SectionList espera). */
  data: Transacoes[];
};

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
    ] = await Promise.all([
      listTransacoes(null, null, { ateData: fimMes }),
      // Com inicio e fim informados a busca nao tem o limite de 50 linhas do
      // feed recente, entao a media e a projecao saem do mes inteiro.
      listTransacoes(inicioMes, fimMes),
      resumoCaixa(hoje, fimMes),
      listItensTransacao(),
      listTransacoesCompra(),
      listEmpresas(),
      getLocalPadrao(),
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

    setTransacoes(transacoesDoBanco);
    setItens(itensDoBanco);
    setCompras(comprasDoBanco);
    setEmpresas(empresasDoBanco);
    setLocalPadrao(localPadraoDoBanco);
    setResumo({
      saldoAtual: caixa.saldoAtual,
      gastoMes: projecao.gastoRealizado,
      mediaDiaria: projecao.mediaDiaria,
      comprometidoMes: Math.abs(caixa.comprometido),
      projecaoMes: projecao.projecao,
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

  const secoes = useMemo((): SecaoDia[] => {
    const porDia = new Map<string, Transacoes[]>();

    for (const transacao of transacoes) {
      const doDia = porDia.get(transacao.data) ?? [];
      doDia.push(transacao);
      porDia.set(transacao.data, doDia);
    }

    return [...porDia.entries()]
      .sort(([a], [b]) => (a < b ? 1 : -1))
      .map(([dia, doDia]) => ({
        dia,
        total: doDia.reduce((soma, transacao) => soma + transacao.valor, 0),
        data: doDia,
      }));
  }, [transacoes]);

  /**
   * Os itens de uma compra parcelada pertencem a transacao da compra, que fica
   * fora do caixa e nao aparece na lista. Para eles nao sumirem da tela, sao
   * mostrados na 1a parcela - a unica que cai no mes da compra.
   */
  const itensPorTransacao = useMemo(() => {
    const agrupado = new Map<string, ItemTransacao[]>();

    for (const item of itens) {
      const atuais = agrupado.get(item.transacao_id) ?? [];
      atuais.push(item);
      agrupado.set(item.transacao_id, atuais);
    }

    const compraPorPlano = new Map<string, string>();

    for (const compra of compras) {
      if (compra.plano_id) {
        compraPorPlano.set(compra.plano_id, compra.id);
      }
    }

    for (const transacao of transacoes) {
      if (!transacao.plano_id || transacao.parcela_numero !== 1) {
        continue;
      }

      const compraId = compraPorPlano.get(transacao.plano_id);
      const itensDaCompra = compraId ? agrupado.get(compraId) : undefined;

      if (itensDaCompra) {
        agrupado.set(transacao.id, itensDaCompra);
      }
    }

    return agrupado;
  }, [itens, compras, transacoes]);

  const nomesEmpresas = useMemo(
    () => new Map(empresas.map((empresa) => [empresa.id, empresa.nome])),
    [empresas],
  );

  const nomeEmpresa = useCallback(
    (id?: string | null): string => (id ? (nomesEmpresas.get(id) ?? '') : ''),
    [nomesEmpresas],
  );

  const adicionarLancamento = useCallback(
    async (lancamento: NovoLancamento): Promise<void> => {
      // Tudo ou nada: sem a transacao, uma falha no meio deixava o lancamento
      // gravado sem parte dos itens (ou o plano sem as parcelas).
      await emTransacao(async () => {
        const agora = new Date().toISOString();
        const parcelamento = lancamento.parcelamento;

        /**
         * No parcelamento os itens vao para a transacao da compra (valor cheio),
         * nunca para a parcela: a parcela e caixa, a compra e o que foi comprado.
         */
        let transacaoDosItens: string;

        if (parcelamento && parcelamento.parcelas > 1) {
          const { compraTransacaoId } = await criarCompraParcelada({
            descricao: lancamento.descricao,
            empresaId: lancamento.empresaId,
            valorTotal: lancamento.valor,
            dataCompra: lancamento.data,
            parcelas: parcelamento.parcelas,
            primeiraParcela: parcelamento.primeiraParcela,
            local: localPadrao,
          });

          transacaoDosItens = compraTransacaoId;
        } else {
          transacaoDosItens = uuid4();

          await insertTransacao({
            id: transacaoDosItens,
            descricao: lancamento.descricao,
            valor: lancamento.valor,
            data: lancamento.data,
            empresa_id: lancamento.empresaId,
            local: localPadrao,
            created_at: agora,
          });
        }

        for (const item of lancamento.itens) {
          await insertItemTransacao({
            id: uuid4(),
            transacao_id: transacaoDosItens,
            produto_id: item.produtoId,
            variante_id: item.varianteId,
            descricao: item.descricao,
            valor: item.precoUnitario,
            quantidade: item.quantidade,
            created_at: agora,
          });

          if (item.produtoId && item.varianteId) {
            await registrarPrecoVariante({
              produtoId: item.produtoId,
              varianteId: item.varianteId,
              empresaId: lancamento.empresaId,
              preco: item.precoUnitario,
              data: toDataHistorico(lancamento.data),
              local: localPadrao,
            });
          }
        }
      });

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
    adicionarLancamento,
    excluir,
    restaurar,
  };
}

/** `true` quando a data (YYYY-MM-DD) ainda nao chegou. */
export const ehFuturo = (data: string): boolean => data > hojeIso();
