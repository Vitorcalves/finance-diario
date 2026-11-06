import dayjs from 'dayjs';
import 'dayjs/locale/pt-br';
import { View } from 'react-native';
import { Button, Text } from '../../../components/ui';
import type { FaturaComTotal } from '../../../models/faturas';
import { useTheme } from '../../../theme';
import { formatarData, toCurrency } from '../../../utils/format';

type FaturaCardProps = {
  fatura: FaturaComTotal;
  hoje: string;
  onPagar: () => void;
};

const rotuloMes = (mesRef: string): string => {
  const data = dayjs(`${mesRef}-01`).locale('pt-br');
  const texto = data.format('MMM/YYYY');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/** Uma linha de ciclo: mes de referencia, status, vencimento e total. */
export default function FaturaCard({ fatura, hoje, onPagar }: FaturaCardProps): React.ReactNode {
  const { colors, sharedStyles } = useTheme();

  const status = fatura.paga
    ? { rotulo: 'Paga', cor: colors.success }
    : fatura.data_fechamento < hoje
      ? { rotulo: 'Fechada', cor: colors.danger }
      : { rotulo: 'Aberta', cor: colors.primary };
  const aPagar = !fatura.paga && fatura.restante < 0;
  const vencida = aPagar && fatura.data_vencimento < hoje;
  /**
   * Ja teve pagamento, mas uma compra lancada depois deixou diferenca.
   * Compara em centavos: a soma das compras pode vir com ruido de ponto
   * flutuante, e o restante ja vem arredondado.
   */
  const pagaEmParte =
    aPagar && Math.round(fatura.restante * 100) !== Math.round(fatura.total * 100);

  return (
    <View style={sharedStyles.listCard}>
      <View style={sharedStyles.listCardInfo}>
        <Text style={sharedStyles.listCardTitle}>{rotuloMes(fatura.mes_ref)}</Text>
        <Text style={sharedStyles.listCardDetail}>
          {`Fecha ${formatarData(fatura.data_fechamento)} · vence ${formatarData(fatura.data_vencimento)}`}
        </Text>
        <Text style={[sharedStyles.listCardDetail, { color: colors.textStrong }]}>
          Total: {toCurrency(Math.abs(fatura.total))}
          {pagaEmParte ? ` · falta ${toCurrency(Math.abs(fatura.restante))}` : ''}
        </Text>
        {vencida ? (
          <Text style={[sharedStyles.listCardDetail, { color: colors.danger }]}>Vencida</Text>
        ) : null}
      </View>

      <View style={sharedStyles.iconButtonRow}>
        <View style={[sharedStyles.chip, { borderColor: status.cor }]}>
          <Text style={[sharedStyles.chipText, { color: status.cor }]}>{status.rotulo}</Text>
        </View>
        {aPagar ? <Button label="Pagar" variant="primary" size="sm" onPress={onPagar} /> : null}
      </View>
    </View>
  );
}
