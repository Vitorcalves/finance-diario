import Ionicons from '@expo/vector-icons/Ionicons';
import { View } from 'react-native';
import { BarraProgresso, Button, Text } from '../../../components/ui';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import { formatarData, toCurrency } from '../../../utils/format';
import { ROTULO_FREQUENCIA } from '../../../utils/parcelas';
import type { PlanoNaTela } from '../types';

type PlanoCardProps = {
  item: PlanoNaTela;
  onEncerrar: () => void;
  onExcluir: () => void;
};

/** Cartao de uma assinatura ou de um parcelamento, com o progresso das parcelas. */
export default function PlanoCard({
  item,
  onEncerrar,
  onExcluir,
}: PlanoCardProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const { plano } = item;
  const assinatura = plano.tipo === 'assinatura';
  const ativo = item.emAndamento;
  const totalParcelas = plano.total_parcelas ?? null;

  const ritmo = assinatura
    ? ROTULO_FREQUENCIA[plano.frequencia]
    : `${totalParcelas}x de ${toCurrency(item.valorParcela)}`;

  return (
    <View style={[sharedStyles.card, !ativo && styles.cardEncerrado]}>
      <View style={styles.header}>
        <View
          style={[
            styles.icone,
            item.ehEntrada && { backgroundColor: colors.successSoft },
            !ativo && styles.iconeEncerrado,
          ]}
        >
          <Ionicons
            name={item.ehEntrada ? 'cash-outline' : assinatura ? 'repeat' : 'card-outline'}
            size={iconSize.md}
            color={!ativo ? colors.textMuted : item.ehEntrada ? colors.success : colors.primary}
          />
        </View>

        <View style={styles.info}>
          <Text style={sharedStyles.listCardTitle} numberOfLines={1}>
            {plano.descricao}
          </Text>
          <Text style={styles.meta} numberOfLines={1}>
            {item.ehEntrada ? 'Entrada programada · ' : ''}
            {ritmo}
            {item.empresa ? ` · ${item.empresa}` : ''}
          </Text>
        </View>

        <Text style={[styles.valorParcela, item.ehEntrada && { color: colors.success }]}>
          {`${item.ehEntrada ? '+' : ''}${toCurrency(item.valorParcela)}`}
        </Text>
      </View>

      {totalParcelas !== null && (
        <View style={styles.progresso}>
          <BarraProgresso
            total={totalParcelas}
            segmentos={[
              {
                valor: item.cobrancasPagas,
                cor: item.concluido ? colors.success : colors.primary,
              },
            ]}
          />
          <View style={styles.linha}>
            <Text style={styles.rotulo}>
              {`${item.cobrancasPagas} de ${totalParcelas} pagas · ${toCurrency(item.totalPago)}`}
            </Text>
            {plano.valor_total !== null && plano.valor_total !== undefined && (
              <Text
                style={styles.rotulo}
              >{`Total ${toCurrency(Math.abs(plano.valor_total))}`}</Text>
            )}
          </View>
        </View>
      )}

      <View style={styles.linhas}>
        {assinatura && plano.frequencia !== 'mensal' && (
          <View style={styles.linha}>
            <Text style={styles.rotulo}>Equivale por mês</Text>
            <Text style={styles.valor}>{toCurrency(item.custoMensal)}</Text>
          </View>
        )}

        {assinatura && (
          <View style={styles.linha}>
            <Text style={styles.rotulo}>{item.ehEntrada ? 'Já recebido' : 'Já pago'}</Text>
            <Text style={styles.valor}>
              {`${item.cobrancasPagas} ${item.cobrancasPagas === 1 ? 'cobrança' : 'cobranças'} · ${toCurrency(item.totalPago)}`}
            </Text>
          </View>
        )}

        <View style={styles.linha}>
          <Text style={styles.rotulo}>
            {ativo
              ? item.ehEntrada
                ? 'Próxima entrada'
                : 'Próxima cobrança'
              : item.concluido
                ? 'Quitado'
                : 'Encerrado em'}
          </Text>
          <Text style={[styles.valor, ativo && styles.valorDestaque]}>
            {ativo && item.proximaCobranca
              ? formatarData(item.proximaCobranca)
              : plano.data_fim
                ? formatarData(plano.data_fim)
                : '-'}
          </Text>
        </View>
      </View>

      <View style={styles.acoes}>
        {ativo && (
          <Button
            label="Encerrar"
            icon="stop-circle-outline"
            variant="secondary"
            size="sm"
            flex
            onPress={onEncerrar}
          />
        )}
        <Button
          label="Excluir"
          icon="trash-outline"
          variant="danger"
          size="sm"
          flex
          onPress={onExcluir}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  cardEncerrado: {
    backgroundColor: colors.surfaceMuted,
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  icone: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeEncerrado: {
    backgroundColor: colors.surface,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  meta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  valorParcela: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  progresso: {
    gap: spacing.xs,
  },
  linhas: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    gap: spacing.xs,
  },
  linha: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  rotulo: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  valor: {
    fontSize: fontSize.small,
    fontWeight: fontWeight.medium,
    color: colors.text,
  },
  valorDestaque: {
    color: colors.primary,
    fontWeight: fontWeight.bold,
  },
  acoes: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
}));
