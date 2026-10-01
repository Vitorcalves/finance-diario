import Ionicons from '@expo/vector-icons/Ionicons';
import dayjs from 'dayjs';
import { Switch, View } from 'react-native';
import BrazilianDateInput from '../../../components/BrazilianDateInput';
import { ChipSelector, PressableScale, Text } from '../../../components/ui';
import {
  fontSize,
  fontWeight,
  iconSize,
  makeStyles,
  radius,
  spacing,
  useTheme,
} from '../../../theme';
import { dividirEmParcelas } from '../../../utils/parcelas';
import { toCurrency } from '../../../utils/format';
import { vibrarSelecao } from '../../../utils/haptics';

/** Atalhos de parcelamento; qualquer outro numero sai pelos botoes de - e +. */
const OPCOES_PARCELAS = [2, 3, 4, 5, 6, 10, 12, 18, 24];

const MINIMO_PARCELAS = 2;
const MAXIMO_PARCELAS = 72;

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
  /** Total da compra, sempre positivo, usado na previa das parcelas. */
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
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const valores = dividirEmParcelas(total, parcelas);
  const primeira = valores[0] ?? 0;
  const ultima = valores[valores.length - 1] ?? 0;

  const ajustar = (passo: number): void => {
    const nova = Math.min(MAXIMO_PARCELAS, Math.max(MINIMO_PARCELAS, parcelas + passo));

    if (nova !== parcelas) {
      vibrarSelecao();
      onChangeParcelas(nova);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.linhaSwitch}>
        <View style={styles.textoSwitch}>
          <Text style={sharedStyles.label}>Compra parcelada</Text>
          <Text style={styles.ajuda}>
            O valor cheio fica na compra; o caixa recebe uma parcela por mês.
          </Text>
        </View>
        <Switch
          value={ativo}
          onValueChange={onAlternar}
          trackColor={{ false: colors.borderStrong, true: colors.primary }}
          thumbColor={colors.onHero}
        />
      </View>

      {ativo && (
        <>
          <View style={styles.contador}>
            <PressableScale
              style={styles.botaoContador}
              onPress={(): void => ajustar(-1)}
              disabled={parcelas <= MINIMO_PARCELAS}
              escala={0.9}
              accessibilityRole="button"
              accessibilityLabel="Menos uma parcela"
            >
              <Ionicons name="remove" size={iconSize.md} color={colors.primary} />
            </PressableScale>

            <View style={styles.contadorTexto}>
              <Text style={styles.contadorNumero}>{`${parcelas}x`}</Text>
              {total > 0 && (
                <Text style={styles.previa}>
                  {primeira === ultima
                    ? `de ${toCurrency(primeira)}`
                    : `${toCurrency(primeira)} e depois ${toCurrency(ultima)}`}
                </Text>
              )}
            </View>

            <PressableScale
              style={styles.botaoContador}
              onPress={(): void => ajustar(1)}
              disabled={parcelas >= MAXIMO_PARCELAS}
              escala={0.9}
              accessibilityRole="button"
              accessibilityLabel="Mais uma parcela"
            >
              <Ionicons name="add" size={iconSize.md} color={colors.primary} />
            </PressableScale>
          </View>

          <ChipSelector
            opcoes={OPCOES_PARCELAS.map((quantidade) => ({
              valor: quantidade,
              rotulo: `${quantidade}x`,
            }))}
            selecionado={parcelas}
            onSelecionar={onChangeParcelas}
            scroll
          />

          <Text style={sharedStyles.label}>Vencimento da 1ª parcela</Text>
          <BrazilianDateInput
            key={`primeira-parcela-${dataInputKey}`}
            defaultValue={primeiraParcela}
            onChangeValue={onChangePrimeiraParcela}
            placeholder={dayjs().format('DD/MM/YYYY')}
            style={[sharedStyles.input, sharedStyles.inputSpaced]}
          />
        </>
      )}
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  container: {
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    paddingTop: spacing.md,
    marginTop: spacing.sm,
    gap: spacing.sm,
  },
  linhaSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  textoSwitch: {
    flex: 1,
  },
  ajuda: {
    fontSize: fontSize.caption,
    color: colors.textSubtle,
  },
  contador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceMuted,
  },
  botaoContador: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contadorTexto: {
    flex: 1,
    alignItems: 'center',
  },
  contadorNumero: {
    fontSize: fontSize.section,
    fontWeight: fontWeight.heavy,
    color: colors.textStrong,
  },
  previa: {
    fontSize: fontSize.caption,
    color: colors.textMuted,
  },
}));
