import { useState } from 'react';
import { View } from 'react-native';
import dayjs from 'dayjs';
import BrazilianDateInput from '../../../components/BrazilianDateInput';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import { BottomSheet, Button, ChipSelector, Text, TextInput } from '../../../components/ui';
import type { ContaComSaldo } from '../../../models/contas';
import { fontSize, fontWeight, makeStyles, useTheme } from '../../../theme';
import { toCurrency } from '../../../utils/format';

export type ModoTransferenciaReserva = 'aporte' | 'resgate';

export type DadosTransferenciaReserva = {
  modo: ModoTransferenciaReserva;
  reservaId: string;
  caixaId: string;
  valor: number;
  data: string;
  descricao: string;
};

type TransferenciaReservaModalProps = {
  visivel: boolean;
  modo: ModoTransferenciaReserva;
  reserva: ContaComSaldo | null;
  /** Caixas ativas parceiras da transferencia; a primeira ja vem selecionada. */
  caixas: ContaComSaldo[];
  salvando: boolean;
  onFechar: () => void;
  /** Devolve `true` quando a transferencia foi gravada, o que fecha o painel. */
  onConfirmar: (dados: DadosTransferenciaReserva) => Promise<boolean>;
};

/**
 * Aporte (caixa -> reserva) ou resgate (reserva -> caixa), direto do card da
 * reserva. Valor, data e descricao; o caixa parceiro vem pre-selecionado.
 */
export default function TransferenciaReservaModal({
  visivel,
  modo,
  reserva,
  caixas,
  salvando,
  onFechar,
  onConfirmar,
}: TransferenciaReservaModalProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const aporte = modo === 'aporte';

  const [valor, setValor] = useState('');
  const [data, setData] = useState(dayjs().format('YYYY-MM-DD'));
  const [dataInputKey, setDataInputKey] = useState(0);
  const [descricao, setDescricao] = useState('');
  const [caixaId, setCaixaId] = useState<string | null>(null);

  // Ao abrir: caixa parceira pre-selecionada e campos limpos. Ajuste durante
  // a renderizacao (padrao "You Might Not Need an Effect").
  const [visivelAnterior, setVisivelAnterior] = useState(visivel);
  if (visivel !== visivelAnterior) {
    setVisivelAnterior(visivel);
    if (visivel) {
      setValor('');
      setData(dayjs().format('YYYY-MM-DD'));
      setDataInputKey((atual) => atual + 1);
      setDescricao('');
      setCaixaId(caixas[0]?.id ?? null);
    }
  }

  const valorNumero = Number(valor) || 0;
  const caixa = caixas.find((conta) => conta.id === caixaId);
  const saldoApos = aporte
    ? (caixa?.saldo ?? 0) - valorNumero
    : (reserva?.saldo ?? 0) - valorNumero;
  const alvoDoSaldo = aporte ? 'do caixa' : 'da reserva';

  const confirmar = (): void => {
    if (!reserva || !caixaId) {
      return;
    }

    void (async (): Promise<void> => {
      const salvou = await onConfirmar({
        modo,
        reservaId: reserva.id,
        caixaId,
        valor: valorNumero,
        data: data.trim(),
        descricao: descricao.trim(),
      });

      if (salvou) {
        onFechar();
      }
    })();
  };

  return (
    <BottomSheet
      visivel={visivel}
      onFechar={onFechar}
      titulo={aporte ? `Aportar em ${reserva?.nome ?? ''}` : `Resgatar de ${reserva?.nome ?? ''}`}
      subtitulo={
        aporte ? 'Dinheiro do caixa para a reserva.' : 'Dinheiro da reserva de volta ao caixa.'
      }
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button
            label={aporte ? 'Aportar' : 'Resgatar'}
            icon={aporte ? 'arrow-down-circle' : 'arrow-up-circle'}
            loading={salvando}
            flex
            onPress={confirmar}
          />
        </View>
      }
    >
      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Valor (R$) *</Text>
        <BrazilianIntegerInput
          value={valor}
          onChangeValue={setValor}
          decimalScale={2}
          placeholder="Ex.: 500,00"
          style={sharedStyles.input}
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>{aporte ? 'De (caixa)' : 'Para (caixa)'}</Text>
        <ChipSelector
          opcoes={caixas.map((conta) => ({
            valor: conta.id,
            rotulo: conta.nome,
          }))}
          selecionado={caixaId}
          onSelecionar={setCaixaId}
          scroll
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Data</Text>
        <BrazilianDateInput
          key={`transferencia-${dataInputKey}`}
          defaultValue={data}
          onChangeValue={setData}
          placeholder={dayjs().format('DD/MM/YYYY')}
          style={sharedStyles.input}
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Descrição (opcional)</Text>
        <TextInput
          value={descricao}
          onChangeText={setDescricao}
          placeholder={aporte ? 'Ex.: Aporte mensal' : 'Ex.: Resgate para viagem'}
          style={sharedStyles.input}
        />
      </View>

      {valorNumero > 0 ? (
        <Text style={[styles.saldoApos, saldoApos < 0 && styles.saldoNegativo]}>
          {`Saldo ${alvoDoSaldo} após: ${toCurrency(saldoApos)}`}
          {saldoApos < 0 ? ' — ficará negativo' : ''}
        </Text>
      ) : null}
    </BottomSheet>
  );
}

const useStyles = makeStyles((colors) => ({
  saldoApos: {
    fontSize: fontSize.caption,
    fontWeight: fontWeight.medium,
    color: colors.textMuted,
  },
  saldoNegativo: {
    color: colors.danger,
    fontWeight: fontWeight.bold,
  },
}));
