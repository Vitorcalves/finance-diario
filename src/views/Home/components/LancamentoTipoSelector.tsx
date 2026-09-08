import {Pressable, StyleSheet, Text, View} from 'react-native';
import {colors, fontSize, fontWeight, radius, spacing} from '../../../theme';
import type {TipoLancamento} from '../types';
import React from "react";

type LancamentoTipoSelectorProps = {
  tipo: TipoLancamento;
  onChange: (tipo: TipoLancamento) => void;
};

/** Alternador entre saida e entrada. */
export default function LancamentoTipoSelector({
                                                 tipo,
                                                 onChange,
                                               }: LancamentoTipoSelectorProps): React.ReactNode {
  return (
    <View style={styles.row}>
      <Pressable
        style={[styles.button, tipo === 'saida' && styles.buttonActiveSaida]}
        onPress={(): void => onChange('saida')}
      >
        <Text style={[styles.text, tipo === 'saida' && styles.textActive]}>Saida</Text>
      </Pressable>

      <Pressable
        style={[styles.button, tipo === 'entrada' && styles.buttonActiveEntrada]}
        onPress={(): void => onChange('entrada')}
      >
        <Text style={[styles.text, tipo === 'entrada' && styles.textActive]}>Entrada</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  buttonActiveSaida: {
    backgroundColor: colors.danger,
    borderColor: colors.danger,
  },
  buttonActiveEntrada: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  text: {
    fontWeight: fontWeight.bold,
    fontSize: fontSize.body,
    color: colors.textBody,
  },
  textActive: {
    color: colors.textInverse,
  },
});
