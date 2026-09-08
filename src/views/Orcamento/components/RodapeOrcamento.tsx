import { StyleSheet, Text, View } from 'react-native';
import { Button } from '../../../components/ui';
import { sharedStyles } from '../../../theme';
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
  return (
    <View style={sharedStyles.footer}>
      <View style={sharedStyles.totalRow}>
        <Text style={sharedStyles.totalLabel}>Total do orcamento</Text>
        <Text style={sharedStyles.totalValue}>{toCurrency(total)}</Text>
      </View>

      <View style={sharedStyles.actionsRow}>
        <Button label="Limpar" variant="secondary" flex onPress={onLimpar} />
        <Button
          label={salvando ? 'Registrando...' : 'Registrar no historico'}
          disabled={salvando}
          style={styles.registrar}
          onPress={onRegistrar}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  registrar: {
    flex: 2,
  },
});
