import React, { useCallback, useMemo, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Pressable, ScrollView, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { listTransacoes, type Transacoes } from '../models/transacoesModel';
import { type Empresa, listEmpresas } from '../models/empresas';
import { EmptyState, LoadingState, ScreenHeader } from '../components/ui';
import { colors, fontSize, fontWeight, iconSize, radius, sharedStyles, spacing } from '../theme';

dayjs.locale('pt-br');

/** Altura util dos dois graficos, em pixels. */
const ALTURA_ACUMULADO = 140;
const ALTURA_POR_DIA = 96;
/** Altura minima de uma barra com valor, para um gasto pequeno nao sumir. */
const BARRA_MINIMA = 3;
/** Quantidade de tracos que formam a linha pontilhada de referencia. */
const TRACOS_REFERENCIA = 26;

export type DiaDoMes = {
  /** Data no formato YYYY-MM-DD. */
  data: string;
  dia: number;
  /** Total gasto no dia, sempre positivo (saidas). */
  gasto: number;
  /** Total recebido no dia, sempre positivo (entradas). */
  entrada: number;
  /** Gasto somado do dia 1 ate este dia. */
  acumulado: number;
  fimDeSemana: boolean;
  /** Dias ainda nao vividos no mes corrente: sem barra, so projecao. */
  futuro: boolean;
  hoje: boolean;
};

const toCurrency = (value: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const toCurrencyCurto = (value: number): string =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value);

/** Saidas entram como valor negativo; aqui trabalhamos sempre com o gasto positivo. */
const gastoDe = (transacao: Transacoes): number =>
  transacao.valor < 0 ? Math.abs(transacao.valor) : 0;

const entradaDe = (transacao: Transacoes): number => (transacao.valor > 0 ? transacao.valor : 0);

const somaGastos = (transacoes: Transacoes[]): number =>
  transacoes.reduce((soma, transacao) => soma + gastoDe(transacao), 0);

/** Estilos dependentes dos dados ficam em funcoes, fora do JSX (regra no-inline-styles). */
const alturaBarra = (valor: number, maximo: number, altura: number): ViewStyle => {
  if (valor <= 0) {
    return { height: 0 };
  }

  const proporcao = maximo > 0 ? valor / maximo : 0;

  return { height: Math.max(BARRA_MINIMA, proporcao * altura) };
};

const posicaoLinha = (valor: number, maximo: number, altura: number): ViewStyle => ({
  bottom: maximo > 0 ? Math.min(altura, (valor / maximo) * altura) : 0,
});

export default function MensalView(): React.ReactNode {
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

  const trocarMes = (novoMes: dayjs.Dayjs): void => {
    setMesSelecionado(novoMes);
    setDiaSelecionado(null);
  };

  const nomeEmpresa = (id?: string | null): string =>
    empresas.find((empresa) => empresa.id === id)?.nome ?? '';

  const hoje = dayjs();
  const mesCorrente = mesSelecionado.isSame(hoje, 'month');
  const mesFuturo = mesSelecionado.isAfter(hoje, 'month');
  const diasNoMes = mesSelecionado.daysInMonth();

  /** Dias do mes ja vividos: base da media diaria e da projecao. */
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

  const resumo = useMemo(() => {
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

  const comparativo = useMemo(() => {
    const totalAnterior = somaGastos(transacoesMesAnterior);

    /** Mesmo ponto do mes passado, para a comparacao nao punir o mes em andamento. */
    const ateMesmoDia = somaGastos(
      transacoesMesAnterior.filter((transacao) => dayjs(transacao.data).date() <= diasDecorridos),
    );

    const variacao =
      ateMesmoDia > 0 ? ((resumo.gastoTotal - ateMesmoDia) / ateMesmoDia) * 100 : null;

    return { totalAnterior, ateMesmoDia, variacao };
  }, [transacoesMesAnterior, diasDecorridos, resumo.gastoTotal]);

  /** Continua a curva do acumulado ate o fim do mes usando a media diaria atual. */
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

  const detalheDia = useMemo(() => {
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

  const semMovimento = transacoesMes.length === 0;

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader
        title="Gastos do mes"
        subtitle="Como o gasto evolui do dia 1 ate o fim do mes"
        right={
          mesCorrente ? null : (
            <Pressable onPress={(): void => trocarMes(dayjs())} style={sharedStyles.headerAction}>
              <Ionicons name="today-outline" size={iconSize.lg} color={colors.primary} />
            </Pressable>
          )
        }
      />

      {loading ? (
        <LoadingState message="Carregando o mes..." />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.scrollContent}
        >
          <View style={styles.navRow}>
            <Pressable
              onPress={(): void => trocarMes(mesSelecionado.subtract(1, 'month'))}
              style={styles.navButton}
            >
              <Ionicons name="chevron-back" size={iconSize.sm} color={colors.primary} />
            </Pressable>

            <Text style={styles.monthLabel}>{mesSelecionado.format('MMMM YYYY')}</Text>

            <Pressable
              onPress={(): void => trocarMes(mesSelecionado.add(1, 'month'))}
              style={styles.navButton}
            >
              <Ionicons name="chevron-forward" size={iconSize.sm} color={colors.primary} />
            </Pressable>
          </View>

          {semMovimento ? (
            <EmptyState
              icon="calendar-outline"
              message="Nenhum lancamento neste mes"
              hint="Registre um gasto na tela inicial para acompanhar o ritmo do mes."
            />
          ) : (
            <>
              <View style={sharedStyles.card}>
                <Text style={styles.resumoLabel}>
                  {mesCorrente ? 'Gasto ate hoje' : 'Gasto no mes'}
                </Text>
                <Text style={styles.resumoValor}>{toCurrency(resumo.gastoTotal)}</Text>
                <Text style={styles.resumoPeriodo}>
                  {mesFuturo
                    ? `${resumo.diasComGasto} dia(s) com gasto ja lancado`
                    : `1 a ${diasDecorridos} de ${mesSelecionado.format('MMMM')} - ${resumo.diasComGasto} dia(s) com gasto`}
                </Text>

                {comparativo.variacao !== null && (
                  <View style={styles.variacaoRow}>
                    <Ionicons
                      name={comparativo.variacao >= 0 ? 'trending-up' : 'trending-down'}
                      size={iconSize.sm}
                      color={comparativo.variacao >= 0 ? colors.danger : colors.success}
                    />
                    <Text
                      style={[
                        styles.variacaoTexto,
                        comparativo.variacao >= 0 ? sharedStyles.negative : sharedStyles.positive,
                      ]}
                    >
                      {`${comparativo.variacao >= 0 ? '+' : ''}${comparativo.variacao.toFixed(0)}%`}
                    </Text>
                    <Text style={styles.variacaoDetalhe}>
                      {`vs. ${toCurrency(comparativo.ateMesmoDia)} no mesmo periodo do mes passado`}
                    </Text>
                  </View>
                )}

                <View style={styles.statsRow}>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>Media por dia</Text>
                    <Text style={styles.statValue}>{toCurrency(resumo.mediaDiaria)}</Text>
                  </View>
                  <View style={styles.statBox}>
                    <Text style={styles.statLabel}>
                      {mesCorrente ? 'Projecao do mes' : 'Entradas'}
                    </Text>
                    <Text style={styles.statValue}>
                      {toCurrency(mesCorrente ? resumo.projecao : resumo.entradaTotal)}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={sharedStyles.card}>
                <View style={styles.cardTituloRow}>
                  <Text style={sharedStyles.sectionTitle}>Acumulado</Text>
                  <Text style={styles.escalaTexto}>{toCurrencyCurto(escalaAcumulado)}</Text>
                </View>

                <View style={styles.chartArea}>
                  <View style={styles.chartBars}>
                    {dias.map((dia, index) => (
                      <View key={dia.data} style={styles.chartColumnFlush}>
                        {projecaoPorDia[index] > 0 && (
                          <View
                            style={[
                              styles.areaProjetada,
                              alturaBarra(projecaoPorDia[index], escalaAcumulado, ALTURA_ACUMULADO),
                            ]}
                          />
                        )}
                        {!dia.futuro && (
                          <View
                            style={[
                              styles.areaAcumulada,
                              alturaBarra(dia.acumulado, escalaAcumulado, ALTURA_ACUMULADO),
                            ]}
                          />
                        )}
                      </View>
                    ))}
                  </View>

                  {comparativo.totalAnterior > 0 && (
                    <View
                      style={[
                        styles.linhaReferencia,
                        posicaoLinha(comparativo.totalAnterior, escalaAcumulado, ALTURA_ACUMULADO),
                      ]}
                    >
                      {Array.from({ length: TRACOS_REFERENCIA }, (_, index) => (
                        <View key={index} style={styles.traco} />
                      ))}
                    </View>
                  )}
                </View>

                <View style={styles.eixoRow}>
                  <Text style={styles.eixoTexto}>1</Text>
                  <Text style={styles.eixoTexto}>8</Text>
                  <Text style={styles.eixoTexto}>15</Text>
                  <Text style={styles.eixoTexto}>22</Text>
                  <Text style={styles.eixoTexto}>{diasNoMes}</Text>
                </View>

                <View style={styles.legendaRow}>
                  <View style={styles.legendaItem}>
                    <View style={styles.legendaAcumulado} />
                    <Text style={styles.legendaTexto}>Gasto realizado</Text>
                  </View>

                  {mesCorrente && (
                    <View style={styles.legendaItem}>
                      <View style={styles.legendaProjecao} />
                      <Text style={styles.legendaTexto}>Projecao</Text>
                    </View>
                  )}

                  {comparativo.totalAnterior > 0 && (
                    <View style={styles.legendaItem}>
                      <View style={styles.legendaLinha} />
                      <Text style={styles.legendaTexto}>
                        {`Mes passado fechou em ${toCurrencyCurto(comparativo.totalAnterior)}`}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={sharedStyles.card}>
                <View style={styles.cardTituloRow}>
                  <Text style={sharedStyles.sectionTitle}>Por dia</Text>
                  <Text style={styles.escalaTexto}>{toCurrencyCurto(escalaDiaria)}</Text>
                </View>

                <View style={styles.chartBarsEspacadas}>
                  {dias.map((dia) => (
                    <Pressable
                      key={dia.data}
                      style={styles.chartColumnDia}
                      onPress={(): void =>
                        setDiaSelecionado((atual) => (atual === dia.data ? null : dia.data))
                      }
                    >
                      <View
                        style={[
                          styles.barraDia,
                          dia.fimDeSemana && styles.barraFimDeSemana,
                          dia.hoje && styles.barraHoje,
                          diaSelecionado === dia.data && styles.barraSelecionada,
                          alturaBarra(dia.gasto, escalaDiaria, ALTURA_POR_DIA),
                        ]}
                      />
                    </Pressable>
                  ))}
                </View>

                <View style={styles.eixoRow}>
                  <Text style={styles.eixoTexto}>1</Text>
                  <Text style={styles.eixoTexto}>8</Text>
                  <Text style={styles.eixoTexto}>15</Text>
                  <Text style={styles.eixoTexto}>22</Text>
                  <Text style={styles.eixoTexto}>{diasNoMes}</Text>
                </View>

                {resumo.maiorDia !== null && resumo.maiorDia.gasto > 0 && (
                  <Text style={styles.destaqueTexto}>
                    {`Maior dia: ${dayjs(resumo.maiorDia.data).format('DD/MM (ddd)')} - ${toCurrency(resumo.maiorDia.gasto)}`}
                  </Text>
                )}

                {detalheDia ? (
                  <View style={styles.detalheBox}>
                    <View style={styles.detalheHeader}>
                      <Text style={styles.detalheData}>
                        {dayjs(detalheDia.dia.data).format('dddd, DD/MM')}
                      </Text>
                      <Text style={styles.detalheTotal}>{toCurrency(detalheDia.dia.gasto)}</Text>
                    </View>

                    {detalheDia.lancamentos.length === 0 ? (
                      <Text style={sharedStyles.inlineEmptyText}>Nenhum lancamento neste dia.</Text>
                    ) : (
                      detalheDia.lancamentos.map((lancamento) => {
                        const empresa = nomeEmpresa(lancamento.empresa_id);

                        return (
                          <View key={lancamento.id} style={styles.lancamentoRow}>
                            <View style={styles.lancamentoInfo}>
                              <Text style={styles.lancamentoDescricao} numberOfLines={1}>
                                {lancamento.descricao}
                              </Text>
                              {empresa ? (
                                <Text style={styles.lancamentoEmpresa}>{empresa}</Text>
                              ) : null}
                            </View>
                            <Text
                              style={[
                                styles.lancamentoValor,
                                lancamento.valor < 0
                                  ? sharedStyles.negative
                                  : sharedStyles.positive,
                              ]}
                            >
                              {toCurrency(lancamento.valor)}
                            </Text>
                          </View>
                        );
                      })
                    )}
                  </View>
                ) : (
                  <Text style={styles.dicaTexto}>Toque em uma barra para ver o dia.</Text>
                )}
              </View>
            </>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthLabel: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },

  // Resumo do mes
  resumoLabel: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  resumoValor: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.heavy,
    color: colors.primaryDark,
  },
  resumoPeriodo: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  variacaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: spacing.xs,
  },
  variacaoTexto: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
  variacaoDetalhe: {
    flex: 1,
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  statsRow: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xs,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.primarySurface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  statLabel: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  statValue: {
    marginTop: 2,
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },

  // Graficos
  cardTituloRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  escalaTexto: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  chartArea: {
    position: 'relative',
    height: ALTURA_ACUMULADO,
  },
  chartBars: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: ALTURA_ACUMULADO,
  },
  /** Colunas coladas: a serie acumulada deve ser lida como area, nao como barras. */
  chartColumnFlush: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  areaAcumulada: {
    backgroundColor: colors.primary,
  },
  areaProjetada: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.primarySoft,
  },
  linhaReferencia: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  traco: {
    width: 4,
    height: 1,
    backgroundColor: colors.textSubtle,
  },
  chartBarsEspacadas: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: ALTURA_POR_DIA,
    gap: 2,
  },
  chartColumnDia: {
    flex: 1,
    height: ALTURA_POR_DIA,
    justifyContent: 'flex-end',
  },
  barraDia: {
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  barraFimDeSemana: {
    backgroundColor: colors.textSubtle,
  },
  barraHoje: {
    backgroundColor: colors.primaryDark,
  },
  barraSelecionada: {
    backgroundColor: colors.warning,
  },
  eixoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  eixoTexto: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  legendaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  legendaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  legendaAcumulado: {
    width: 10,
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.primary,
  },
  legendaProjecao: {
    width: 10,
    height: 10,
    borderRadius: radius.sm,
    backgroundColor: colors.primarySoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  legendaLinha: {
    width: 10,
    height: 1,
    backgroundColor: colors.textSubtle,
  },
  legendaTexto: {
    fontSize: fontSize.micro,
    color: colors.textMuted,
  },
  destaqueTexto: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  dicaTexto: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },

  // Detalhe do dia selecionado
  detalheBox: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  detalheHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  detalheData: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
    textTransform: 'capitalize',
  },
  detalheTotal: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.danger,
  },
  lancamentoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
  },
  lancamentoInfo: {
    flex: 1,
  },
  lancamentoDescricao: {
    fontSize: fontSize.small,
    color: colors.textBody,
  },
  lancamentoEmpresa: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
  lancamentoValor: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.bold,
  },
});
