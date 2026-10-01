import { View } from 'react-native';
import { Button, Text } from '../../../components/ui';
import { makeStyles, useTheme } from '../../../theme';
import { toCurrency } from '../../../utils/format';

type RodapeOrcamentoProps = {
  total: number;
  salvando: boolean;
  onLimpar: () => void;
  onRegistrar: () => void;
};

/** Rodape fixo com o total e as acoes do orcamento. */
export default function RodapeOrcamento({
  total,
  salvando,
  onLimpar,
  onRegistrar,
}: RodapeOrcamentoProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  return (
    <View style={sharedStyles.footer}>
      <View style={sharedStyles.totalRow}>
        <Text style={sharedStyles.totalLabel}>Total do orçamento</Text>
        <Text style={sharedStyles.totalValue}>{toCurrency(total)}</Text>
      </View>

      <View style={sharedStyles.actionsRow}>
        <Button label="Limpar" variant="secondary" flex onPress={onLimpar} />
        <Button
          label="Registrar no histórico"
          icon="cloud-done-outline"
          loading={salvando}
          style={styles.registrar}
          onPress={onRegistrar}
        />
      </View>
    </View>
  );
}

const useStyles = makeStyles(() => ({
  registrar: {
    flex: 2,
  },
}));
