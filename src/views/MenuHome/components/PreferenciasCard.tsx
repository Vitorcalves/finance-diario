import { StyleSheet, Text, View } from 'react-native';
import { ChipSelector } from '../../../components/ui';
import { colors, fontSize, fontWeight, sharedStyles } from '../../../theme';
import { Locais } from '../../../utils/local';

type PreferenciasCardProps = {
  localPadrao: number;
  onAlterarLocalPadrao: (id: number) => void;
};

/**
 * Preferencias do app, configuradas uma vez em vez de perguntadas em cada
 * formulario - hoje so o local padrao de compra usado no lancamento e no
 * orcamento.
 */
export default function PreferenciasCard({
  localPadrao,
  onAlterarLocalPadrao,
}: PreferenciasCardProps): React.ReactNode {
  return (
    <View style={sharedStyles.card}>
      <Text style={styles.titulo}>Local padrao de compra</Text>
      <Text style={styles.hint}>
        Usado automaticamente ao registrar lancamentos e precos, sem perguntar toda vez.
      </Text>

      <ChipSelector
        opcoes={Locais.listar().map((item) => ({ valor: item.id, rotulo: item.descricao }))}
        selecionado={localPadrao}
        onSelecionar={onAlterarLocalPadrao}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  titulo: {
    fontSize: fontSize.input,
    fontWeight: fontWeight.bold,
    color: colors.primaryDark,
  },
  hint: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
});
