import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { type Empresa, listEmpresas } from '../../models/empresas';
import {
  cancelarPlano,
  criarAssinatura,
  materializarPlanos,
} from '../../models/materializacaoPlanos';
import { deletePlanoById, listPlanos, type PlanoPagamento } from '../../models/planosPagamento';
import { listTransacoes, type Transacoes } from '../../models/transacoesModel';
import { custoMensalEquivalente, proximaOcorrencia } from '../../utils/parcelas';
import type { DadosFormularioAssinatura, PlanoNaTela, ResumoPlanos } from './types';

const hojeIso = (): string => dayjs().format('YYYY-MM-DD');

export type UsePlanos = {
  loading: boolean;
  salvando: boolean;
  empresas: Empresa[];
  ativos: PlanoNaTela[];
  encerrados: PlanoNaTela[];
  resumo: ResumoPlanos;
  /** Cria a assinatura e ja materializa as cobrancas do mes; `true` quando salvou. */
  salvarAssinatura: (dados: DadosFormularioAssinatura) => Promise<boolean>;
  /** Encerra hoje e apaga so as cobrancas futuras. */
  encerrar: (item: PlanoNaTela) => void;
  /** Apaga o plano e todas as cobrancas dele, inclusive as ja pagas. */
  excluir: (item: PlanoNaTela) => void;
};

/** Cadastro de assinaturas e acompanhamento dos parcelamentos em aberto. */
export function usePlanos(): UsePlanos {
  const [planos, setPlanos] = useState<PlanoPagamento[]>([]);
  const [cobrancas, setCobrancas] = useState<Transacoes[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      await materializarPlanos();

      const [planosDoBanco, empresasDoBanco] = await Promise.all([listPlanos(), listEmpresas()]);

      // Janela larga o bastante para cobrir parcelamentos longos dos dois lados.
      const cobrancasDoBanco = await listTransacoes(
        dayjs().subtract(5, 'year').format('YYYY-MM-DD'),
        dayjs().add(5, 'year').format('YYYY-MM-DD'),
      );

      setPlanos(planosDoBanco);
      setEmpresas(empresasDoBanco);
      setCobrancas(cobrancasDoBanco.filter((cobranca) => cobranca.plano_id !== null));
    } catch (error: unknown) {
      console.error('Erro ao carregar os planos:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar as assinaturas e parcelamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void carregar();
    }, [carregar]),
  );

  const nomeEmpresa = useCallback(
    (id?: string | null): string => empresas.find((empresa) => empresa.id === id)?.nome ?? '',
    [empresas],
  );

  const naTela = useMemo((): PlanoNaTela[] => {
    const hoje = hojeIso();

    return planos.map((plano) => {
      const doPlano = cobrancas.filter((cobranca) => cobranca.plano_id === plano.id);
      const pagas = doPlano.filter((cobranca) => cobranca.data <= hoje);

      const proxima = plano.ativo
        ? proximaOcorrencia({
            dataInicio: plano.data_inicio,
            frequencia: plano.frequencia,
            intervalo: plano.intervalo,
            aPartirDe: hoje,
            totalOcorrencias: plano.total_parcelas ?? null,
            dataFim: plano.data_fim ?? null,
          })
        : null;

      const concluido = plano.ativo === 1 && proxima === null;

      return {
        plano,
        valorParcela: Math.abs(plano.valor_parcela),
        proximaCobranca: proxima?.data ?? null,
        concluido,
        emAndamento: plano.ativo === 1 && !concluido,
        cobrancasPagas: pagas.length,
        totalPago: pagas.reduce((soma, cobranca) => soma + Math.abs(cobranca.valor), 0),
        custoMensal: custoMensalEquivalente(
          Math.abs(plano.valor_parcela),
          plano.frequencia,
          plano.intervalo,
        ),
        empresa: nomeEmpresa(plano.empresa_id),
      };
    });
  }, [planos, cobrancas, nomeEmpresa]);

  const ativos = useMemo(() => naTela.filter((item) => item.emAndamento), [naTela]);
  const encerrados = useMemo(() => naTela.filter((item) => !item.emAndamento), [naTela]);

  const resumo = useMemo((): ResumoPlanos => {
    const hoje = hojeIso();
    const fimDoMes = dayjs().endOf('month').format('YYYY-MM-DD');

    const assinaturasPorMes = ativos
      .filter((item) => item.plano.tipo === 'assinatura')
      .reduce((soma, item) => soma + item.custoMensal, 0);

    const aVencer = cobrancas.filter((cobranca) => cobranca.data > hoje);

    const parcelasAVencer = aVencer.reduce((soma, cobranca) => soma + Math.abs(cobranca.valor), 0);

    const comprometidoNoMes = aVencer
      .filter((cobranca) => cobranca.data <= fimDoMes)
      .reduce((soma, cobranca) => soma + Math.abs(cobranca.valor), 0);

    return { assinaturasPorMes, parcelasAVencer, comprometidoNoMes };
  }, [ativos, cobrancas]);

  const salvarAssinatura = useCallback(
    async (dados: DadosFormularioAssinatura): Promise<boolean> => {
      const descricao = dados.descricao.trim();

      if (!descricao) {
        Alert.alert('Erro', 'Descricao da assinatura e obrigatoria');
        return false;
      }

      if (dados.valor <= 0) {
        Alert.alert('Erro', 'Informe o valor da cobranca');
        return false;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.dataInicio)) {
        Alert.alert('Erro', 'Informe uma data valida para a 1a cobranca');
        return false;
      }

      try {
        setSalvando(true);

        await criarAssinatura({
          descricao,
          empresaId: dados.empresaId,
          // Assinatura e sempre saida: o sinal negativo entra aqui.
          valorParcela: -Math.abs(dados.valor),
          dataInicio: dados.dataInicio,
          frequencia: dados.frequencia,
          intervalo: Math.max(1, dados.intervalo),
        });

        await carregar();
        return true;
      } catch (error: unknown) {
        console.error('Erro ao salvar a assinatura:', error);
        Alert.alert('Erro', 'Nao foi possivel salvar a assinatura');
        return false;
      } finally {
        setSalvando(false);
      }
    },
    [carregar],
  );

  const encerrar = useCallback(
    (item: PlanoNaTela): void => {
      Alert.alert(
        'Encerrar plano',
        `As cobrancas de "${item.plano.descricao}" que ainda nao venceram serao removidas. O historico ja pago continua no app.`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Encerrar',
            style: 'destructive',
            onPress: (): void => {
              void (async (): Promise<void> => {
                try {
                  await cancelarPlano(item.plano);
                  await carregar();
                } catch (error: unknown) {
                  console.error('Erro ao encerrar o plano:', error);
                  Alert.alert('Erro', 'Nao foi possivel encerrar o plano');
                }
              })();
            },
          },
        ],
      );
    },
    [carregar],
  );

  const excluir = useCallback(
    (item: PlanoNaTela): void => {
      Alert.alert(
        'Excluir plano',
        `Todas as cobrancas de "${item.plano.descricao}" serao apagadas, inclusive as ja pagas. Deseja continuar?`,
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress: (): void => {
              void (async (): Promise<void> => {
                try {
                  await deletePlanoById(item.plano.id);
                  await carregar();
                } catch (error: unknown) {
                  console.error('Erro ao excluir o plano:', error);
                  Alert.alert('Erro', 'Nao foi possivel excluir o plano');
                }
              })();
            },
          },
        ],
      );
    },
    [carregar],
  );

  return {
    loading,
    salvando,
    empresas,
    ativos,
    encerrados,
    resumo,
    salvarAssinatura,
    encerrar,
    excluir,
  };
}
