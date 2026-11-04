import { useCallback, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import { useToast } from '../../components/ui';
import {
  type CategoriaLancamento,
  listCategoriasLancamento,
} from '../../models/categoriasLancamento';
import { type Conta, listContasPorTipo } from '../../models/contas';
import { type Empresa, listEmpresas } from '../../models/empresas';
import {
  cancelarPlano,
  criarAssinatura,
  materializarPlanos,
} from '../../models/materializacaoPlanos';
import { deletePlanoById, listPlanos, type PlanoPagamento } from '../../models/planosPagamento';
import { listCobrancasDePlanos, type Transacoes } from '../../models/transacoesModel';
import { custoMensalEquivalente, proximaOcorrencia } from '../../utils/parcelas';
import type { DadosFormularioAssinatura, PlanoNaTela, ResumoPlanos } from './types';

const hojeIso = (): string => dayjs().format('YYYY-MM-DD');

export type UsePlanos = {
  loading: boolean;
  salvando: boolean;
  empresas: Empresa[];
  categorias: CategoriaLancamento[];
  /** Contas caixa e cartoes ativas: quem paga a cobranca (ou recebe o salario). */
  contas: Conta[];
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
  const toast = useToast();
  const [planos, setPlanos] = useState<PlanoPagamento[]>([]);
  const [cobrancas, setCobrancas] = useState<Transacoes[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [categorias, setCategorias] = useState<CategoriaLancamento[]>([]);
  const [contas, setContas] = useState<Conta[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async (): Promise<void> => {
    try {
      await materializarPlanos();

      const [
        planosDoBanco,
        empresasDoBanco,
        categoriasDoBanco,
        caixasDoBanco,
        cartoesDoBanco,
        cobrancasDoBanco,
      ] = await Promise.all([
        listPlanos(),
        listEmpresas(),
        listCategoriasLancamento(),
        listContasPorTipo('caixa'),
        listContasPorTipo('cartao'),
        listCobrancasDePlanos(),
      ]);

      setPlanos(planosDoBanco);
      setEmpresas(empresasDoBanco);
      setCategorias(categoriasDoBanco);
      setContas([...caixasDoBanco, ...cartoesDoBanco]);
      setCobrancas(cobrancasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar os planos:', error);
      Alert.alert('Erro', 'Não foi possível carregar as assinaturas e parcelamentos');
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
        ehEntrada: Boolean(plano.conta_destino_id),
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

    // Salario e renda, nao compromisso: fica de fora das somas de gasto.
    const gastos = ativos.filter((item) => !item.ehEntrada);

    const assinaturasPorMes = gastos
      .filter((item) => item.plano.tipo === 'assinatura')
      .reduce((soma, item) => soma + item.custoMensal, 0);

    const planosEntradaIds = new Set(
      ativos.filter((item) => item.ehEntrada).map((item) => item.plano.id),
    );
    const aVencer = cobrancas.filter(
      (cobranca) => cobranca.data > hoje && !planosEntradaIds.has(cobranca.plano_id ?? ''),
    );

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
        Alert.alert('Erro', 'Descrição da assinatura é obrigatória');
        return false;
      }

      if (dados.valor <= 0) {
        Alert.alert('Erro', 'Informe o valor da cobrança');
        return false;
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(dados.dataInicio)) {
        Alert.alert('Erro', 'Informe uma data válida para a 1ª cobrança');
        return false;
      }

      if (dados.contaDestinoId && !dados.contaId) {
        Alert.alert('Erro', 'Escolha o caixa que recebe o salário');
        return false;
      }

      try {
        setSalvando(true);

        const ehEntrada = Boolean(dados.contaDestinoId);

        await criarAssinatura({
          descricao,
          empresaId: ehEntrada ? null : dados.empresaId,
          categoriaId: dados.categoriaId,
          // Cobranca e saida; salario e entrada (sinal positivo).
          valorParcela: ehEntrada ? Math.abs(dados.valor) : -Math.abs(dados.valor),
          dataInicio: dados.dataInicio,
          frequencia: dados.frequencia,
          intervalo: Math.max(1, dados.intervalo),
          contaId: ehEntrada ? null : dados.contaId,
          contaDestinoId: dados.contaDestinoId,
        });

        await carregar();
        toast.mostrar(`Assinatura "${descricao}" criada`);
        return true;
      } catch (error: unknown) {
        console.error('Erro ao salvar a assinatura:', error);
        Alert.alert('Erro', 'Não foi possível salvar a assinatura');
        return false;
      } finally {
        setSalvando(false);
      }
    },
    [carregar, toast],
  );

  const encerrar = useCallback(
    (item: PlanoNaTela): void => {
      Alert.alert(
        'Encerrar plano',
        `As cobranças de "${item.plano.descricao}" que ainda não venceram serão removidas. O histórico já pago continua no app.`,
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
                  toast.mostrar(`"${item.plano.descricao}" encerrado`);
                } catch (error: unknown) {
                  console.error('Erro ao encerrar o plano:', error);
                  Alert.alert('Erro', 'Não foi possível encerrar o plano');
                }
              })();
            },
          },
        ],
      );
    },
    [carregar, toast],
  );

  const excluir = useCallback(
    (item: PlanoNaTela): void => {
      Alert.alert(
        'Excluir plano',
        `Todas as cobranças de "${item.plano.descricao}" serão apagadas, inclusive as já pagas. Deseja continuar?`,
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
                  toast.mostrar(`"${item.plano.descricao}" excluído`);
                } catch (error: unknown) {
                  console.error('Erro ao excluir o plano:', error);
                  Alert.alert('Erro', 'Não foi possível excluir o plano');
                }
              })();
            },
          },
        ],
      );
    },
    [carregar, toast],
  );

  return {
    loading,
    salvando,
    empresas,
    categorias,
    contas,
    ativos,
    encerrados,
    resumo,
    salvarAssinatura,
    encerrar,
    excluir,
  };
}
