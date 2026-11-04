import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import { BarraProgresso, IconButton, Text } from '../../../components/ui';
import type { ContaComSaldo, TipoConta } from '../../../models/contas';
import { toCurrency } from '../../../utils/format';
import { useTheme } from '../../../theme';

type NomeIcone = ComponentProps<typeof Ionicons>['name'];

export const ICONE_TIPO_CONTA: Record<TipoConta, NomeIcone> = {
  caixa: 'wallet-outline',
  reserva: 'archive-outline',
  cartao: 'card-outline',
};

type ContaCardProps = {
  conta: ContaComSaldo;
  onEditar: () => void;
  onRemover: () => void;
  /** So cartao: abre a tela de faturas do ciclo. */
  onVerFaturas?: () => void;
  /** So reserva: abre o detalhe com meta, progresso e extrato. */
  onVerDetalhe?: () => void;
  /** So reserva: abre o aporte rapido (caixa -> reserva). */
  onAportar?: () => void;
  /** So reserva: abre o resgate rapido (reserva -> caixa). */
  onResgatar?: () => void;
};

/** Linha da lista de contas, com saldo e os detalhes do tipo. */
export default function ContaCard({
  conta,
  onEditar,
  onRemover,
  onVerFaturas,
  onVerDetalhe,
  onAportar,
  onResgatar,
}: ContaCardProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const negativa = conta.saldo < 0;
  const progressoMeta =
    conta.tipo === 'reserva' && conta.meta_valor ? Math.min(conta.saldo / conta.meta_valor, 1) : 0;

  return (
    <View style={sharedStyles.listCard}>
      <Ionicons
        name={ICONE_TIPO_CONTA[conta.tipo]}
        size={22}
        color={conta.cor ?? colors.textSubtle}
      />

      <View style={sharedStyles.listCardInfo}>
        <Text style={sharedStyles.listCardTitle}>
          {conta.nome}
          {conta.ativo ? '' : ' (inativa)'}
        </Text>

        {conta.tipo === 'cartao' ? (
          <Text style={sharedStyles.listCardDetail}>
            {`Fecha dia ${conta.dia_fechamento} · vence dia ${conta.dia_vencimento}`}
          </Text>
        ) : null}

        {conta.tipo === 'reserva' && conta.meta_valor ? (
          <Text style={sharedStyles.listCardDetail}>
            {`Meta: ${toCurrency(conta.meta_valor)} · ${Math.round(progressoMeta * 100)}%`}
          </Text>
        ) : null}

        <Text style={[sharedStyles.listCardDetail, { color: colors.textStrong }]}>
          Saldo: {toCurrency(conta.saldo)}
        </Text>

        {negativa ? (
          <Text style={[sharedStyles.listCardDetail, { color: colors.danger }]}>
            Saldo negativo
          </Text>
        ) : null}

        {conta.tipo === 'reserva' && conta.meta_valor ? (
          <BarraProgresso
            total={1}
            corTrilho={colors.border}
            segmentos={[{ valor: progressoMeta, cor: conta.cor ?? colors.primary }]}
          />
        ) : null}
      </View>

      <View style={sharedStyles.iconButtonRow}>
        {onVerFaturas ? (
          <IconButton icon="receipt-outline" variant="primary" onPress={onVerFaturas} />
        ) : null}
        {onVerDetalhe ? (
          <IconButton icon="stats-chart-outline" variant="primary" onPress={onVerDetalhe} />
        ) : null}
        {onAportar ? (
          <IconButton icon="arrow-down-circle" variant="info" onPress={onAportar} />
        ) : null}
        {onResgatar ? (
          <IconButton icon="arrow-up-circle" variant="primary" onPress={onResgatar} />
        ) : null}
        <IconButton icon="pencil" variant="primary" onPress={onEditar} />
        <IconButton icon="trash" variant="danger" onPress={onRemover} />
      </View>
    </View>
  );
}
