import React from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import dayjs from 'dayjs';
import BrazilianDateInput from '../../../components/BrazilianDateInput';
import {ChipSelector} from '../../../components/ui';
import {colors, fontSize, sharedStyles, spacing} from '../../../theme';
import {dividirEmParcelas} from '../../../utils/parcelas';
import {toCurrency} from '../../../utils/format';

/** Atalhos de parcelamento; o valor exato pode ser digitado no campo de parcelas. */
const OPCOES_PARCELAS = [2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24];

type ParcelamentoSelectorProps = {
  /** `false` mantem o lancamento a vista. */
  ativo: boolean;
  onAlternar: (ativo: boolean) => void;
  parcelas: number;
  onChangeParcelas: (parcelas: number) => void;
  /** Vencimento da 1a parcela (ISO). */
  primeiraParcela: string;
  onChangePrimeiraParcela: (data: string) => void;
  /** Remonta o campo de data quando o formulario e limpo. */
  dataInputKey: number;
  /** Total da compra, sempre positivo, usado na prévia das parcelas. */
  total: number;
};

/** Liga o parcelamento e mostra a previa de quanto cai por mes. */
export default function ParcelamentoSelector({
                                               ativo,
                                               onAlternar,
                                               parcelas,
                                               onChangeParcelas,
                                               primeiraParcela,
                                               onChangePrimeiraParcela,
                                               dataInputKey,
                                               total,
                                             }: ParcelamentoSelectorProps): React.ReactNode {
  const valores = dividirEmParcelas(total, parcelas);
  const primeira = valores[0] ?? 0;
  const ultima = valores[valores.length - 1] ?? 0;

  return (
    <View style={styles.container}>
      <View style={styles.linhaSwitch}>
        <Text style={sharedStyles.label}>Compra parcelada</Text>
        <Switch
          value={ativo}
          onValueChange={onAlternar}
          trackColor={{false: colors.borderStrong, true: colors.primary}}
          thumbColor={colors.surface}
        />
      </View>

      {ativo && (
        <>
          <Text style={styles.ajuda}>
            O valor cheio fica na compra; o caixa recebe uma parcela por mes.
          </Text>

          <Text style={sharedStyles.label}>Parcelas</Text>
          <ChipSelector
            opcoes={OPCOES_PARCELAS.map((quantidade) => ({
              valor: quantidade,
              rotulo: `${quantidade}x`,
            }))}
            selecionado={parcelas}
            onSelecionar={onChangeParcelas}
            scroll
          />

          <Text style={sharedStyles.label}>Vencimento da 1a parcela</Text>
          <BrazilianDateInput
            key={`primeira-parcela-${dataInputKey}`}
            defaultValue={primeiraParcela}
            onChangeValue={onChangePrimeiraParcela}
            placeholder={dayjs().format('DD/MM/YYYY')}
            placeholderTextColor={colors.placeholder}
            style={[sharedStyles.input, sharedStyles.inputSpaced]}
          />

          {total > 0 && (
            <Text style={styles.previa}>
              {primeira === ultima
                ? `${parcelas}x de ${toCurrency(primeira)}`
                : `${parcelas}x: ${toCurrency(primeira)} nas primeiras e ${toCurrency(ultima)} nas demais`}
            </Text>
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
  },
  linhaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  ajuda: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
    marginBottom: spacing.md,
  },
  previa: {
    fontSize: fontSize.small,
    color: colors.primaryDark,
    marginBottom: spacing.sm,
  },
});
