import { StyleSheet, Text, View } from 'react-native';
import { colors, fontSize } from '../../../theme';

type EixoDiasProps = {
  diasNoMes: number;
};

/** Marcacoes fixas do eixo horizontal dos graficos. */
export default function EixoDias({ diasNoMes }: EixoDiasProps): React.ReactNode {
  return (
    <View style={styles.row}>
      <Text style={styles.texto}>1</Text>
      <Text style={styles.texto}>8</Text>
      <Text style={styles.texto}>15</Text>
      <Text style={styles.texto}>22</Text>
      <Text style={styles.texto}>{diasNoMes}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  texto: {
    fontSize: fontSize.micro,
    color: colors.textSubtle,
  },
});
