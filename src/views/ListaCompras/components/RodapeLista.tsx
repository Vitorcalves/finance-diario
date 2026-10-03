import { View } from 'react-native';
import { Button, Text } from '../../../components/ui';
import { fontSize, fontWeight, makeStyles, spacing, useTheme } from '../../../theme';
import { toCurrency } from '../../../utils/format';
import type { TotaisLista } from '../useListaCompras';

type RodapeListaProps = {
  totais: TotaisLista;
  nomeMercadoAtual: string | null;
  onFinalizar: () => void;
};

/**
 * Rodape fixo: quanto a lista sai no mercado em que o usuario esta, quanto ja
 * foi para o carrinho e o fechamento da compra.
 */
export default function RodapeLista({
  totais,
  nomeMercadoAtual,
  onFinalizar,
}: RodapeListaProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();

  return (
    <View style={sharedStyles.footer}>
      <View style={styles.valores}>
        <View style={styles.bloco}>
          <Text style={styles.rotulo} numberOfLines={1}>
            {nomeMercadoAtual ? `Total em ${nomeMercadoAtual}` : 'Nenhum mercado escolhido'}
          </Text>
          <Text style={styles.principal}>
            {nomeMercadoAtual ? toCurrency(totais.noMercadoAtual) : '—'}
          </Text>
          {nomeMercadoAtual && (
            <Text style={styles.detalhe}>
              {`${totais.itensComPrecoAtual} de ${totais.itens} itens com preço`}
            </Text>
          )}
        </View>
        <View style={[styles.bloco, styles.blocoDireita]}>
          <Text style={styles.rotulo}>{`No carrinho (${totais.comprados})`}</Text>
          <Text style={styles.secundario}>{toCurrency(totais.noCarrinho)}</Text>
          {totais.carrinhoSemPreco > 0 && (
            <Text style={styles.detalhe}>{`${totais.carrinhoSemPreco} sem preço`}</Text>
          )}
        </View>
      </View>

      <Button
        label="Finalizar compra"
        icon="bag-check-outline"
        disabled={totais.comprados === 0}
        onPress={onFinalizar}
      />
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  valores: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  bloco: {
    flexShrink: 1,
    gap: 2,
  },
  blocoDireita: {
    alignItems: 'flex-end',
  },
  rotulo: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
  principal: {
    fontSize: fontSize.section,
    fontWeight: fontWeight.bold,
    color: colors.textStrong,
  },
  secundario: {
    fontSize: fontSize.subtitle,
    fontWeight: fontWeight.bold,
    color: colors.textMuted,
  },
  detalhe: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
}));
