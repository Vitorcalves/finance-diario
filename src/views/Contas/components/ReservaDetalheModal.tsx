import Ionicons from '@expo/vector-icons/Ionicons';
import { ScrollView, View } from 'react-native';
import { BottomSheet, BarraProgresso, Text } from '../../../components/ui';
import type { ContaComSaldo } from '../../../models/contas';
import type { Transacoes } from '../../../models/transacoesModel';
import { fontSize, fontWeight, makeStyles, spacing, useTheme } from '../../../theme';
import { formatarData, toCurrency } from '../../../utils/format';

export type DetalheReserva = {
  reserva: ContaComSaldo;
  /** Movimentos em qualquer das pontas, mais recentes primeiro. */
  movimentos: Transacoes[];
  /** Total aportado no mes corrente (entradas como destino). */
  aportadoNoMes: number;
  mesAtual: string;
};

type ReservaDetalheModalProps = {
  detalhe: DetalheReserva | null;
  onFechar: () => void;
};

/**
 * Detalhe da reserva: saldo, meta com progresso, total aportado no mes e o
 * extrato de aportes e resgates. So movimentacao entre contas aparece aqui.
 */
export default function ReservaDetalheModal({
  detalhe,
  onFechar,
}: ReservaDetalheModalProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const reserva = detalhe?.reserva ?? null;

  const progresso =
    reserva?.meta_valor && reserva.meta_valor > 0
      ? Math.min(reserva.saldo / reserva.meta_valor, 1)
      : null;
  const falta =
    reserva?.meta_valor && reserva.meta_valor > 0
      ? Math.max(reserva.meta_valor - reserva.saldo, 0)
      : null;

  return (
    <BottomSheet
      visivel={detalhe !== null}
      onFechar={onFechar}
      titulo={reserva?.nome ?? ''}
      subtitulo="Reserva de investimento"
    >
      {reserva ? (
        <ScrollView style={styles.extrato}>
          <View style={styles.resumo}>
            <Text style={styles.saldoLabel}>Saldo atual</Text>
            <Text style={[styles.saldoValor, reserva.saldo < 0 && { color: colors.danger }]}>
              {toCurrency(reserva.saldo)}
            </Text>

            {reserva.meta_valor ? (
              <>
                <Text style={styles.metaLinha}>
                  {`Meta: ${toCurrency(reserva.meta_valor)} · ${Math.round((progresso ?? 0) * 100)}%`}
                </Text>
                <BarraProgresso
                  total={1}
                  corTrilho={colors.border}
                  segmentos={[{ valor: progresso ?? 0, cor: reserva.cor ?? colors.primary }]}
                />
                <Text style={styles.metaLinha}>
                  {falta && falta > 0 ? `Faltam ${toCurrency(falta)}` : 'Meta atingida'}
                </Text>
              </>
            ) : (
              <Text style={styles.metaLinha}>Sem meta definida</Text>
            )}

            <Text style={styles.aportado}>
              {`Aportado neste mês: ${toCurrency(detalhe?.aportadoNoMes ?? 0)}`}
            </Text>
          </View>

          <Text style={sharedStyles.label}>Aportes e resgates</Text>

          {(detalhe?.movimentos ?? []).length === 0 ? (
            <Text style={styles.vazio}>
              Nenhum aporte ou resgate ainda. Use as setas do card para movimentar.
            </Text>
          ) : (
            (detalhe?.movimentos ?? []).map((movimento) => {
              const entrada = movimento.conta_destino_id === reserva.id;
              const valor = entrada ? -movimento.valor : movimento.valor;

              return (
                <View key={movimento.id} style={styles.movimento}>
                  <Ionicons
                    name={entrada ? 'arrow-down-circle' : 'arrow-up-circle'}
                    size={20}
                    color={entrada ? colors.success : colors.danger}
                  />
                  <View style={styles.movimentoInfo}>
                    <Text style={styles.movimentoDescricao} numberOfLines={1}>
                      {movimento.descricao || (entrada ? 'Aporte' : 'Resgate')}
                    </Text>
                    <Text style={styles.movimentoData}>{formatarData(movimento.data)}</Text>
                  </View>
                  <Text
                    style={[
                      styles.movimentoValor,
                      { color: entrada ? colors.success : colors.danger },
                    ]}
                  >
                    {`${entrada ? '+' : '−'}${toCurrency(Math.abs(valor))}`}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      ) : null}
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  resumo: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  saldoLabel: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  saldoValor: {
    fontSize: fontSize.display,
    fontWeight: fontWeight.heavy,
    color: colors.textStrong,
  },
  metaLinha: {
    fontSize: fontSize.small,
    color: colors.textMuted,
  },
  aportado: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    color: colors.primary,
  },
  extrato: {
    maxHeight: 380,
  },
  vazio: {
    fontSize: fontSize.small,
    color: colors.textSubtle,
  },
  movimento: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  movimentoInfo: {
    flex: 1,
  },
  movimentoDescricao: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  movimentoData: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  movimentoValor: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
  },
}));
