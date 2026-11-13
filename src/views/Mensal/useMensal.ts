import { useCallback, useMemo, useRef, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import {
  type CategoriaLancamento,
  listCategoriasLancamento,
} from '../../models/categoriasLancamento';
import { type Empresa, listEmpresas } from '../../models/empresas';
import { materializarPlanos } from '../../models/materializacaoPlanos';
import { listTransacoes, type Transacoes } from '../../models/transacoesModel';
import { Locais } from '../../utils/local';
import { projetarMes, type SituacaoMes } from '../../utils/projecaoMes';
import { acumuladoMesAnterior } from './comparativo';
import type {
  ComparativoMes,
  DetalheDoDia,
  DiaDoMes,
  GastoPorCategoria,
  GastoPorLocal,
  ResumoMes,
} from './types';

dayjs.locale('pt-br');

/** Saidas entram como valor negativo; aqui trabalhamos sempre com o gasto positivo. */
const gastoDe = (transacao: Transacoes): number =>
  transacao.valor < 0 ? Math.abs(transacao.valor) : 0;

const entradaDe = (transacao: Transacoes): number => (transacao.valor > 0 ? transacao.valor : 0);

/** Uma cobranca com data futura ja esta lancada, mas ainda nao saiu do bolso. */
const jaAconteceu = (transacao: Transacoes, hoje: string): boolean => transacao.data <= hoje;

const somaGastos = (transacoes: Transacoes[]): number =>
  transacoes.reduce((soma, transacao) => soma + gastoDe(transacao), 0);

type DadosMes = {
  mes: string;
  doMes: Transacoes[];
  doMesAnterior: Transacoes[];
  empresas: Empresa[];
  categorias: CategoriaLancamento[];
};

export type UseMensal = {
  /** So na primeira carga; trocar de mes mantem a tela e so atualiza os numeros. */
  loading: boolean;
  /** Buscando outro mes com o anterior ainda na tela. */
  carregando: boolean;
  /** Puxar para atualizar. */
  atualizando: boolean;
  atualizar: () => void;
  mesSelecionado: dayjs.Dayjs;
  trocarMes: (novoMes: dayjs.Dayjs) => void;
  /** -1 ao voltar e 1 ao avancar: direcao da animacao de entrada do mes. */
  direcao: number;
  mesCorrente: boolean;
  mesFuturo: boolean;
  diasNoMes: number;
  /** Dias do mes ja vividos: base da media diaria e da projecao. */
  diasDecorridos: number;
  dias: DiaDoMes[];
  resumo: ResumoMes;
  /** Gasto do mes somado por local de compra, do maior para o menor. */
  gastoPorLocal: GastoPorLocal[];
  /** Gasto do mes por categoria de lancamento, do maior para o menor. */
  gastoPorCategoria: GastoPorCategoria[];
  comparativo: ComparativoMes;
  /** Acumulado do mes anterior por dia do mes exibido: a curva de fundo do grafico. */
  acumuladoAnterior: number[];
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
  const [dados, setDados] = useState<DadosMes | null>(null);
  const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [carregando, setCarregando] = useState(false);
  const [direcao, setDirecao] = useState(0);
  const [atualizando, setAtualizando] = useState(false);
  /** Muda a cada "puxar para atualizar", o que dispara uma nova busca. */
  const [versao, setVersao] = useState(0);
  /** So o resultado da busca mais recente entra na tela (trocas rapidas de mes). */
  const ultimaBusca = useRef(0);

  const transacoesMes = useMemo(() => dados?.doMes ?? [], [dados]);
  const transacoesMesAnterior = useMemo(() => dados?.doMesAnterior ?? [], [dados]);
  const empresas = useMemo(() => dados?.empresas ?? [], [dados]);
  const categorias = useMemo(() => dados?.categorias ?? [], [dados]);

  useFocusEffect(
    useCallback(() => {
      const busca = ultimaBusca.current + 1;
      ultimaBusca.current = busca;
      setCarregando(true);

      const carregar = async (): Promise<DadosMes> => {
        const mesAnterior = mesSelecionado.subtract(1, 'month');
        const fimDoMes = mesSelecionado.endOf('month').format('YYYY-MM-DD');

        // Abrir um mes futuro materializa as assinaturas dele: a projecao nasce
        // com os compromissos ja conhecidos dentro.
        await materializarPlanos(fimDoMes);

        const [doMes, doMesAnterior, empresasDoBanco, categoriasDoBanco] = await Promise.all([
          // Visao de gastos: compra no cartao conta no mes da compra; o
          // pagamento da fatura e as transferencias entre contas ficam fora.
          listTransacoes(mesSelecionado.startOf('month').format('YYYY-MM-DD'), fimDoMes, {
            fluxoGastos: true,
          }),
          listTransacoes(
            mesAnterior.startOf('month').format('YYYY-MM-DD'),
            mesAnterior.endOf('month').format('YYYY-MM-DD'),
            { fluxoGastos: true },
          ),
          listEmpresas(),
          listCategoriasLancamento(),
        ]);

        return {
          mes: mesSelecionado.format('YYYY-MM'),
          doMes,
          doMesAnterior,
          empresas: empresasDoBanco,
          categorias: categoriasDoBanco,
        };
      };

      carregar()
        .then((novos) => {
          if (ultimaBusca.current === busca) {
            setDados(novos);
          }
        })
        .catch((error: unknown) => console.error('Erro ao carregar dados do mes:', error))
        .finally(() => {
          if (ultimaBusca.current === busca) {
            setCarregando(false);
            setLoading(false);
            setAtualizando(false);
          }
        });
      // `versao` so existe para refazer a busca quando o usuario puxa a tela.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [mesSelecionado, versao]),
  );

  const atualizar = useCallback((): void => {
    setAtualizando(true);
    setVersao((atual) => atual + 1);
  }, []);

  const trocarMes = useCallback(
    (novoMes: dayjs.Dayjs): void => {
      setDirecao(novoMes.isBefore(mesSelecionado, 'month') ? -1 : 1);
      setMesSelecionado(novoMes);
      setDiaSelecionado(null);
    },
    [mesSelecionado],
  );

  const alternarDia = useCallback((data: string): void => {
    setDiaSelecionado((atual) => (atual === data ? null : data));
  }, []);

  const nomesEmpresas = useMemo(
    () => new Map(empresas.map((empresa) => [empresa.id, empresa.nome])),
    [empresas],
  );

  const nomeEmpresa = useCallback(
    (id?: string | null): string => (id ? (nomesEmpresas.get(id) ?? '') : ''),
    [nomesEmpresas],
  );

  // Os numeros sao do mes que esta na tela, mesmo durante a busca do proximo.
  const mesExibido = dados ? dayjs(`${dados.mes}-01`) : mesSelecionado;
  const hoje = dayjs();
  const hojeIso = hoje.format('YYYY-MM-DD');
  const mesCorrente = mesExibido.isSame(hoje, 'month');
  const mesFuturo = mesExibido.isAfter(hoje, 'month');
  const situacao: SituacaoMes = mesFuturo ? 'futuro' : mesCorrente ? 'corrente' : 'passado';
  const diasNoMes = mesExibido.daysInMonth();
  const diasDecorridos = mesFuturo ? 0 : mesCorrente ? hoje.date() : diasNoMes;

  const dias = useMemo((): DiaDoMes[] => {
    const base: DiaDoMes[] = Array.from({ length: diasNoMes }, (_, index) => {
      const data = mesExibido.date(index + 1);
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
    // `hoje` e `mesExibido` mudam de identidade a cada render; o que importa
    // deles ja esta nas outras dependencias.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transacoesMes, dados?.mes, diasNoMes, diasDecorridos, mesCorrente, hojeIso]);

  const resumo = useMemo((): ResumoMes => {
    const projecao = projetarMes(transacoesMes, {
      hoje: hojeIso,
      situacao,
      diasDecorridos,
      diasNoMes,
    });

    const diasComGasto = dias.filter((dia) => dia.gasto > 0).length;
    const maiorDia = dias.reduce<DiaDoMes | null>(
      (maior, dia) => (dia.gasto > (maior?.gasto ?? 0) ? dia : maior),
      null,
    );

    return {
      gastoTotal: projecao.gastoRealizado,
      entradaTotal: projecao.entradaRealizada,
      mediaDiaria: projecao.mediaDiaria,
      mediaDiariaVariavel: projecao.mediaDiariaVariavel,
      comprometido: projecao.comprometido,
      projecao: projecao.projecao,
      diasComGasto,
      maiorDia,
    };
  }, [transacoesMes, dias, diasDecorridos, diasNoMes, situacao, hojeIso]);

  /** So o realizado entra: gasto comprometido a vencer ainda nao aconteceu em lugar nenhum. */
  /** So o realizado entra, como no grafico por localidade. */
  const gastoPorCategoria = useMemo((): GastoPorCategoria[] => {
    const porCategoria = new Map<string | null, { gasto: number; lancamentos: number }>();

    for (const transacao of transacoesMes) {
      const gasto = gastoDe(transacao);

      if (gasto <= 0 || !jaAconteceu(transacao, hojeIso)) {
        continue;
      }

      const chave = transacao.categoria_id ?? null;
      const atual = porCategoria.get(chave) ?? { gasto: 0, lancamentos: 0 };
      porCategoria.set(chave, { gasto: atual.gasto + gasto, lancamentos: atual.lancamentos + 1 });
    }

    const categoriasPorId = new Map(categorias.map((categoria) => [categoria.id, categoria]));

    return [...porCategoria.entries()]
      .map(([categoriaId, soma]) => {
        const categoria = categoriaId ? categoriasPorId.get(categoriaId) : undefined;

        return {
          categoriaId: categoria ? categoriaId : null,
          nome: categoria?.nome ?? 'Sem categoria',
          icone: categoria?.icone ?? null,
          cor: categoria?.cor ?? null,
          gasto: soma.gasto,
          lancamentos: soma.lancamentos,
        };
      })
      .sort((a, b) => b.gasto - a.gasto);
  }, [transacoesMes, categorias, hojeIso]);

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

  const acumuladoAnterior = useMemo(
    (): number[] => acumuladoMesAnterior(transacoesMesAnterior, diasNoMes),
    [transacoesMesAnterior, diasNoMes],
  );

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
    carregando,
    atualizando,
    atualizar,
    mesSelecionado,
    trocarMes,
    direcao,
    mesCorrente,
    mesFuturo,
    diasNoMes,
    diasDecorridos,
    dias,
    resumo,
    gastoPorLocal,
    gastoPorCategoria,
    comparativo,
    acumuladoAnterior,
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
