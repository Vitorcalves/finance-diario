import { View } from 'react-native';
import ContaIcone from '../../../components/ContaIcone';
import { BarraProgresso, Button, IconButton, Text } from '../../../components/ui';
import type { ContaComSaldo } from '../../../models/contas';
import { fontSize, fontWeight, iconSize, makeStyles, spacing, useTheme } from '../../../theme';
import { corDaConta, descreverConta, progressoDaMeta, valorDaConta } from '../../../utils/contas';
import { toCurrency } from '../../../utils/format';

type ContaCardProps = {
  conta: ContaComSaldo;
  /** Botao "..." com o resto das acoes da conta (editar, extrato, inativar...). */
  onAbrirAcoes: () => void;
  /** So reserva ativa: aporte rapido (caixa -> reserva). */
  onAportar?: () => void;
  /** So reserva ativa: resgate rapido (reserva -> caixa). */
  onResgatar?: () => void;
  /** So cartao ativo: abre a tela de faturas. */
  onVerFaturas?: () => void;
};

/**
 * Cartao de uma conta, no formato dos cartoes de planos e produtos: selo,
 * nome e linha de apoio no topo, com o "..." das acoes; embaixo o numero
 * principal (saldo, ou o que esta em aberto no cartao), o progresso da meta
 * na reserva e as acoes do dia a dia com rotulo.
 */
export default function ContaCard({
  conta,
  onAbrirAcoes,
  onAportar,
  onResgatar,
  onVerFaturas,
}: ContaCardProps): React.ReactNode {
  const { colors, corCategoria, sharedStyles } = useTheme();
  const styles = useStyles();
  const ativa = Boolean(conta.ativo);
  const descricao = descreverConta(conta);
  const { rotulo, valor, negativo } = valorDaConta(conta);
  const progresso = progressoDaMeta(conta);
  const temAcoes = Boolean(onAportar || onResgatar || onVerFaturas);

  return (
    <View style={[sharedStyles.card, !ativa && styles.cardInativo]}>
      <View style={styles.header}>
        <ContaIcone conta={conta} />

        <View style={styles.info}>
          <Text style={sharedStyles.listCardTitle} numberOfLines={1}>
            {conta.nome}
          </Text>
          {descricao ? (
            <Text style={styles.meta} numberOfLines={1}>
              {descricao}
            </Text>
          ) : null}
        </View>

        <IconButton
          icon="ellipsis-horizontal"
          variant="neutral"
          size={iconSize.sm}
          onPress={onAbrirAcoes}
          accessibilityLabel={`Mais ações de ${conta.nome}`}
        />
      </View>

      <View style={styles.linhas}>
        <View style={styles.linha}>
          <Text style={styles.rotulo}>{rotulo}</Text>
          <Text style={[styles.valor, negativo && { color: colors.danger }]}>
            {toCurrency(valor)}
          </Text>
        </View>

        {progresso ? (
          <View style={styles.progresso}>
            <BarraProgresso
              total={1}
              segmentos={[{ valor: progresso.fracao, cor: corDaConta(conta, corCategoria) }]}
            />
            <Text style={styles.rotulo}>
              {progresso.falta > 0
                ? `${progresso.percentual}% da meta · faltam ${toCurrency(progresso.falta)}`
                : 'Meta atingida'}
            </Text>
          </View>
        ) : null}
      </View>

      {temAcoes ? (
        <View style={styles.acoes}>
          {onAportar ? (
            <Button
              label="Aportar"
              icon="arrow-down-circle-outline"
              variant="secondary"
              size="sm"
              flex
              onPress={onAportar}
            />
          ) : null}
          {onResgatar ? (
            <Button
              label="Resgatar"
              icon="arrow-up-circle-outline"
              variant="secondary"
              size="sm"
              flex
              onPress={onResgatar}
            />
          ) : null}
          {onVerFaturas ? (
            <Button
              label="Ver faturas"
              icon="receipt-outline"
              variant="secondary"
              size="sm"
              flex
              onPress={onVerFaturas}
            />
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  cardInativo: {
    backgroundColor: colors.surfaceMuted,
    opacity: 0.85,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  meta: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  linhas: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.sm,
    gap: spacing.sm,
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
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  progresso: {
    gap: spacing.xs,
  },
  acoes: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
}));
