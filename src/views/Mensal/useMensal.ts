import { useCallback, useMemo, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { materializarPlanos } from '../../models/materializacaoPlanos';
import { listTransacoes, type Transacoes } from '../../models/transacoesModel';
import { Locais } from '../../utils/local';
import type { ComparativoMes, DetalheDoDia, DiaDoMes, GastoPorLocal, ResumoMes } from './types';

dayjs.locale('pt-br');

/** Saidas entram como valor negativo; aqui trabalhamos sempre com o gasto positivo. */
const gastoDe = (transacao: Transacoes): number =>
  transacao.valor < 0 ? Math.abs(transacao.valor) : 0;

const entradaDe = (transacao: Transacoes): number => (transacao.valor > 0 ? transacao.valor : 0);

/** Uma cobranca com data futura ja esta lancada, mas ainda nao saiu do bolso. */
const jaAconteceu = (transacao: Transacoes, hoje: string): boolean => transacao.data <= hoje;

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
  /** Gasto do mes somado por local de compra, do maior para o menor. */
  gastoPorLocal: GastoPorLocal[];
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
    const fimDoMes = mesSelecionado.endOf('month').format('YYYY-MM-DD');

    // Abrir um mes futuro materializa as assinaturas dele: a projecao nasce
    // com os compromissos ja conhecidos dentro.
    await materializarPlanos(fimDoMes);

    const [doMes, doMesAnterior, empresasDoBanco] = await Promise.all([
      listTransacoes(mesSelecionado.startOf('month').format('YYYY-MM-DD'), fimDoMes),
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
  const hojeIso = hoje.format('YYYY-MM-DD');
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
        comprometido: 0,
        entrada: 0,
        acumulado: 0,
        fimDeSemana: diaDaSemana === 0 || diaDaSemana === 6,
        futuro: index + 1 > diasDecorridos,
        hoje: mesCorrente && index + 1 === hoje.date(),
      };
    });

    for (const transacao of transacoesMes) {
      const indice = dayjs(transacao.data).date() - 1;

      if (indice < 0 || indice >= base.length) {
        continue;
      }

      if (jaAconteceu(transacao, hojeIso)) {
        base[indice].gasto += gastoDe(transacao);
        base[indice].entrada += entradaDe(transacao);
      } else {
        base[indice].comprometido += gastoDe(transacao);
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
  }, [transacoesMes, mesSelecionado, diasNoMes, diasDecorridos, mesCorrente, hojeIso]);

  const resumo = useMemo((): ResumoMes => {
    const realizadas = transacoesMes.filter((transacao) => jaAconteceu(transacao, hojeIso));
    const aVencer = transacoesMes.filter((transacao) => !jaAconteceu(transacao, hojeIso));

    const gastoTotal = somaGastos(realizadas);
    const entradaTotal = realizadas.reduce((soma, transacao) => soma + entradaDe(transacao), 0);
    const comprometido = somaGastos(aVencer);

    const mediaDiaria = diasDecorridos > 0 ? gastoTotal / diasDecorridos : 0;

    /**
     * Parcelas e assinaturas ja realizadas saem da media: elas voltam na
     * projecao pelo valor exato, e conta-las duas vezes inflaria o mes.
     */
    const gastoVariavel = somaGastos(realizadas.filter((transacao) => !transacao.plano_id));
    const mediaDiariaVariavel = diasDecorridos > 0 ? gastoVariavel / diasDecorridos : 0;

    const diasRestantes = Math.max(0, diasNoMes - diasDecorridos);

    /** Mes fechado ja tem o total final; no mes corrente somamos o que falta. */
    const projecao = mesFuturo
      ? comprometido
      : mesCorrente
        ? gastoTotal + comprometido + mediaDiariaVariavel * diasRestantes
        : gastoTotal;

    const diasComGasto = dias.filter((dia) => dia.gasto > 0).length;
    const maiorDia = dias.reduce<DiaDoMes | null>(
      (maior, dia) => (dia.gasto > (maior?.gasto ?? 0) ? dia : maior),
      null,
    );

    return {
      gastoTotal,
      entradaTotal,
      mediaDiaria,
      mediaDiariaVariavel,
      comprometido,
      projecao,
      diasComGasto,
      maiorDia,
    };
  }, [transacoesMes, dias, diasDecorridos, diasNoMes, mesCorrente, mesFuturo, hojeIso]);

  /** So o realizado entra: gasto comprometido a vencer ainda nao aconteceu em lugar nenhum. */
  const gastoPorLocal = useMemo((): GastoPorLocal[] => {
    const porLocal = new Map<number, number>();

    for (const transacao of transacoesMes) {
      if (!jaAconteceu(transacao, hojeIso)) {
        continue;
      }

      const localId = transacao.local ?? Locais.padrao;
      porLocal.set(localId, (porLocal.get(localId) ?? 0) + gastoDe(transacao));
    }

    return Locais.listar()
      .map((local) => ({
        localId: local.id,
        descricao: local.descricao,
        gasto: porLocal.get(local.id) ?? 0,
      }))
      .filter((item) => item.gasto > 0)
      .sort((a, b) => b.gasto - a.gasto);
  }, [transacoesMes, hojeIso]);

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

  /**
   * Acumulado projetado dia a dia: parte do realizado e soma, em cada dia que
   * falta, o que ja esta comprometido nele mais a media dos gastos avulsos.
   */
  const projecaoPorDia = useMemo((): number[] => {
    if (!mesCorrente) {
      return [];
    }

    let acumulado = resumo.gastoTotal;

    return dias.map((dia) => {
      if (!dia.futuro) {
        return 0;
      }

      acumulado += dia.comprometido + resumo.mediaDiariaVariavel;
      return acumulado;
    });
  }, [dias, mesCorrente, resumo.gastoTotal, resumo.mediaDiariaVariavel]);

  const escalaAcumulado = Math.max(
    resumo.gastoTotal,
    resumo.projecao,
    comparativo.totalAnterior,
    1,
  );
  const escalaDiaria = Math.max(...dias.map((dia) => Math.max(dia.gasto, dia.comprometido)), 1);

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
    gastoPorLocal,
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
