import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import { View } from 'react-native';
import type { Conta, TipoConta } from '../models/contas';
import { makeStyles, radius, useTheme } from '../theme';
import { corDaConta } from '../utils/contas';

type IconName = ComponentProps<typeof Ionicons>['name'];

export const ICONE_TIPO_CONTA: Record<TipoConta, IconName> = {
  caixa: 'wallet-outline',
  reserva: 'archive-outline',
  cartao: 'card-outline',
};

type ContaIconeProps = {
  conta: Pick<Conta, 'tipo' | 'cor' | 'ativo'>;
  tamanho?: number;
};

/**
 * Selo da conta: o icone do tipo sobre um fundo claro da cor dela, no
 * formato dos selos dos cartoes de planos e produtos. Conta inativa fica
 * apagada.
 */
export default function ContaIcone({ conta, tamanho = 40 }: ContaIconeProps): React.ReactNode {
  const { colors, corCategoria } = useTheme();
  const styles = useStyles();
  const ativa = Boolean(conta.ativo);
  const tinta = ativa ? corDaConta(conta, corCategoria) : colors.textMuted;

  return (
    <View
      style={[
        styles.selo,
        // 15% da cor da conta, como no icone das categorias.
        { width: tamanho, height: tamanho, backgroundColor: ativa ? `${tinta}26` : colors.surface },
      ]}
    >
      <Ionicons
        name={ICONE_TIPO_CONTA[conta.tipo]}
        size={Math.round(tamanho * 0.5)}
        color={tinta}
      />
    </View>
  );
}

const useStyles = makeStyles(() => ({
  selo: {
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
