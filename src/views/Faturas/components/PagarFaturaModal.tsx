import { useState } from 'react';
import { View } from 'react-native';
import BrazilianDateInput from '../../../components/BrazilianDateInput';
import { BottomSheet, Button, ChipSelector, Text } from '../../../components/ui';
import type { Conta } from '../../../models/contas';
import type { FaturaComTotal } from '../../../models/faturas';
import { useTheme } from '../../../theme';
import { toCurrency } from '../../../utils/format';

type PagarFaturaModalProps = {
  visivel: boolean;
  fatura: FaturaComTotal | null;
  contasPagantes: Conta[];
  /** Devolve `true` quando o pagamento foi gravado, o que fecha o painel. */
  onPagar: (faturaId: string, contaPaganteId: string, dataPagamento: string) => Promise<boolean>;
  onFechar: () => void;
};

/** Painel de pagamento da fatura: conta pagante e data do pagamento. */
export default function PagarFaturaModal({
  visivel,
  fatura,
  contasPagantes,
  onPagar,
  onFechar,
}: PagarFaturaModalProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  /** Sugestao: pagar no vencimento; o usuario ajusta se quiser. */
  const [contaPaganteId, setContaPaganteId] = useState<string | null>(null);
  const [dataPagamento, setDataPagamento] = useState('');
  const [dataInputKey, setDataInputKey] = useState(0);
  const [salvando, setSalvando] = useState(false);

  // Ao abrir: primeira caixa como pagante e vencimento como data sugerida.
  // Estado ajustado durante a renderizacao (padrao "You Might Not Need an Effect").
  const [visivelAnterior, setVisivelAnterior] = useState(visivel);
  if (visivel !== visivelAnterior) {
    setVisivelAnterior(visivel);
    if (visivel) {
      setContaPaganteId(contasPagantes[0]?.id ?? null);
      setDataPagamento(fatura?.data_vencimento ?? '');
      setDataInputKey((atual) => atual + 1);
    }
  }

  const pagar = (): void => {
    if (!fatura || !contaPaganteId) {
      return;
    }

    void (async (): Promise<void> => {
      setSalvando(true);
      const pagou = await onPagar(fatura.id, contaPaganteId, dataPagamento.trim());
      setSalvando(false);

      if (pagou) {
        onFechar();
      }
    })();
  };

  return (
    <BottomSheet
      visivel={visivel}
      onFechar={onFechar}
      titulo="Pagar fatura"
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button
            label={`Pagar ${fatura ? toCurrency(Math.abs(fatura.restante)) : ''}`}
            icon="checkmark"
            loading={salvando}
            flex
            onPress={pagar}
          />
        </View>
      }
    >
      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Conta pagante</Text>
        <ChipSelector
          opcoes={contasPagantes.map((conta) => ({
            valor: conta.id,
            rotulo: conta.nome,
          }))}
          selecionado={contaPaganteId}
          onSelecionar={setContaPaganteId}
          scroll
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Data do pagamento</Text>
        <BrazilianDateInput
          key={`pagamento-${dataInputKey}`}
          defaultValue={dataPagamento}
          onChangeValue={setDataPagamento}
          style={sharedStyles.input}
        />
      </View>
    </BottomSheet>
  );
}
