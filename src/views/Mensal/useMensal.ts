import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { listTransacoes, type Transacoes } from '../../models/transacoesModel';
import type { ComparativoMes, DetalheDoDia, DiaDoMes, ResumoMes } from './types';

dayjs.locale('pt-br');

/** Saidas entram como valor negativo; aqui trabalhamos sempre com o gasto positivo. */
const gastoDe = (transacao: Transacoes): number =>
  transacao.valor < 0 ? Math.abs(transacao.valor) : 0;

const entradaDe = (transacao: Transacoes): number => (transacao.valor > 0 ? transacao.valor : 0);

const somaGastos = (transacoes: Transacoes[]): number =>
  transacoes.reduce((soma, transacao) => soma + gastoDe(transacao), 0);

export type UseMensal = {
  loading: boolean;
  mesSelecionado: dayjs.Dayjs;
  trocarMes: (novoMes: dayjs.Dayjs) => void;
  mesCorrente: boolean;
  mesFuturo: boolean;
  diasNoMes: number;
  /** Dias do mes ja vividos: base da media diaria e da projecao. */
  diasDecorridos: number;
  dias: DiaDoMes[];
  resumo: ResumoMes;
  comparativo: ComparativoMes;
  /** Curva do acumulado projetada ate o fim do mes; vazia fora do mes corrente. */
  projecaoPorDia: number[];
  escalaAcumulado: number;
  escalaDiaria: number;
  diaSelecionado: string | null;
  alternarDia: (data: string) => void;
  detalheDia: DetalheDoDia | null;
  nomeEmpresa: (id?: string | null) => string;
  semMovimento: boolean;
};

/** Carrega o mes escolhido e deriva todos os numeros exibidos na tela. */
export function useMensal(): UseMensal {
  const [mesSelecionado, setMesSelecionado] = useState(dayjs());
  const [transacoesMes, setTransacoesMes] = useState<Transacoes[]>([]);
  const [transacoesMesAnterior, setTransacoesMesAnterior] = useState<Transacoes[]>([]);
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const carregarDados = useCallback(async (): Promise<void> => {
    const mesAnterior = mesSelecionado.subtract(1, 'month');

    const [doMes, doMesAnterior, empresasDoBanco] = await Promise.all([
      listTransacoes(
        mesSelecionado.startOf('month').format('YYYY-MM-DD'),
        mesSelecionado.endOf('month').format('YYYY-MM-DD'),
      ),
      listTransacoes(
        mesAnterior.startOf('month').format('YYYY-MM-DD'),
        mesAnterior.endOf('month').format('YYYY-MM-DD'),
      ),
      listEmpresas(),
    ]);

    setTransacoesMes(doMes);
    setTransacoesMesAnterior(doMesAnterior);
    setEmpresas(empresasDoBanco);
  }, [mesSelecionado]);

  useFocusEffect(
    useCallback(() => {
      let ativo = true;

      const carregar = async (): Promise<void> => {
        try {
          setLoading(true);
          await carregarDados();
        } catch (error: unknown) {
          console.error('Erro ao carregar dados do mes:', error);
        } finally {
          if (ativo) {
            setLoading(false);
          }
        }
      };

      void carregar();

      return (): void => {
        ativo = false;
      };
    }, [carregarDados]),
  );

  const trocarMes = useCallback((novoMes: dayjs.Dayjs): void => {
    setMesSelecionado(novoMes);
    setDiaSelecionado(null);
  }, []);

  const alternarDia = useCallback((data: string): void => {
    setDiaSelecionado((atual) => (atual === data ? null : data));
  }, []);

  const nomeEmpresa = useCallback(
    (id?: string | null): string => empresas.find((empresa) => empresa.id === id)?.nome ?? '',
    [empresas],
  );

  const hoje = dayjs();
  const mesCorrente = mesSelecionado.isSame(hoje, 'month');
  const mesFuturo = mesSelecionado.isAfter(hoje, 'month');
  const diasNoMes = mesSelecionado.daysInMonth();
  const diasDecorridos = mesFuturo ? 0 : mesCorrente ? hoje.date() : diasNoMes;

  const dias = useMemo((): DiaDoMes[] => {
    const base: DiaDoMes[] = Array.from({ length: diasNoMes }, (_, index) => {
      const data = mesSelecionado.date(index + 1);
      const diaDaSemana = data.day();

      return {
        data: data.format('YYYY-MM-DD'),
        dia: index + 1,
        gasto: 0,
        entrada: 0,
        acumulado: 0,
        fimDeSemana: diaDaSemana === 0 || diaDaSemana === 6,
        futuro: index + 1 > diasDecorridos,
        hoje: mesCorrente && index + 1 === hoje.date(),
      };
    });

    for (const transacao of transacoesMes) {
      const indice = dayjs(transacao.data).date() - 1;

      if (indice >= 0 && indice < base.length) {
        base[indice].gasto += gastoDe(transacao);
        base[indice].entrada += entradaDe(transacao);
      }
    }

    let acumulado = 0;

    for (const dia of base) {
      acumulado += dia.gasto;
      dia.acumulado = acumulado;
    }

    return base;
    // `hoje` muda a cada render, mas so importa a data: mesCorrente/diasDecorridos ja cobrem.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transacoesMes, mesSelecionado, diasNoMes, diasDecorridos, mesCorrente]);

  const resumo = useMemo((): ResumoMes => {
    const gastoTotal = somaGastos(transacoesMes);
    const entradaTotal = transacoesMes.reduce((soma, transacao) => soma + entradaDe(transacao), 0);
    const mediaDiaria = diasDecorridos > 0 ? gastoTotal / diasDecorridos : 0;

    /** Mes fechado ja tem o total final; no mes corrente projetamos pela media. */
    const projecao = mesCorrente ? mediaDiaria * diasNoMes : gastoTotal;

    const diasComGasto = dias.filter((dia) => dia.gasto > 0).length;
    const maiorDia = dias.reduce<DiaDoMes | null>(
      (maior, dia) => (dia.gasto > (maior?.gasto ?? 0) ? dia : maior),
      null,
    );

    return { gastoTotal, entradaTotal, mediaDiaria, projecao, diasComGasto, maiorDia };
  }, [transacoesMes, dias, diasDecorridos, diasNoMes, mesCorrente]);

  const comparativo = useMemo((): ComparativoMes => {
    const totalAnterior = somaGastos(transacoesMesAnterior);

    /** Mesmo ponto do mes passado, para a comparacao nao punir o mes em andamento. */
    const ateMesmoDia = somaGastos(
      transacoesMesAnterior.filter((transacao) => dayjs(transacao.data).date() <= diasDecorridos),
    );

    const variacao =
      ateMesmoDia > 0 ? ((resumo.gastoTotal - ateMesmoDia) / ateMesmoDia) * 100 : null;

    return { totalAnterior, ateMesmoDia, variacao };
  }, [transacoesMesAnterior, diasDecorridos, resumo.gastoTotal]);

  const projecaoPorDia = useMemo((): number[] => {
    if (!mesCorrente) {
      return [];
    }

    return dias.map((dia) =>
      dia.futuro ? resumo.gastoTotal + resumo.mediaDiaria * (dia.dia - diasDecorridos) : 0,
    );
  }, [dias, mesCorrente, resumo.gastoTotal, resumo.mediaDiaria, diasDecorridos]);

  const escalaAcumulado = Math.max(
    resumo.gastoTotal,
    resumo.projecao,
    comparativo.totalAnterior,
    1,
  );
  const escalaDiaria = Math.max(...dias.map((dia) => dia.gasto), 1);

  const detalheDia = useMemo((): DetalheDoDia | null => {
    if (!diaSelecionado) {
      return null;
    }

    const dia = dias.find((item) => item.data === diaSelecionado);

    if (!dia) {
      return null;
    }

    const lancamentos = transacoesMes.filter(
      (transacao) => dayjs(transacao.data).format('YYYY-MM-DD') === diaSelecionado,
    );

    return { dia, lancamentos };
  }, [diaSelecionado, dias, transacoesMes]);

  return {
    loading,
    mesSelecionado,
    trocarMes,
    mesCorrente,
    mesFuturo,
    diasNoMes,
    diasDecorridos,
    dias,
    resumo,
    comparativo,
    projecaoPorDia,
    escalaAcumulado,
    escalaDiaria,
    diaSelecionado,
    alternarDia,
    detalheDia,
    nomeEmpresa,
    semMovimento: transacoesMes.length === 0,
  };
}
