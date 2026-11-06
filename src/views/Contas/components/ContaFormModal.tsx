import { useState } from 'react';
import { View } from 'react-native';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import ContaIcone from '../../../components/ContaIcone';
import SeletorCor from '../../../components/SeletorCor';
import { BottomSheet, Button, SegmentedControl, Text, TextInput } from '../../../components/ui';
import {
  type ContaComSaldo,
  CONTA_CAIXA_PADRAO,
  podeMudarTipo,
  ROTULO_TIPO_CONTA,
  type TipoConta,
} from '../../../models/contas';
import { makeStyles, spacing, useTheme } from '../../../theme';
import { COR_PADRAO_TIPO_CONTA } from '../../../utils/contas';
import type { DadosContaForm } from '../useContas';

type ContaFormModalProps = {
  visivel: boolean;
  /** Conta em edicao; `null` abre o formulario em branco. */
  conta: ContaComSaldo | null;
  onFechar: () => void;
  /** Devolve `true` quando a conta foi salva, o que fecha o painel. */
  onSalvar: (dados: DadosContaForm, conta: ContaComSaldo | null) => Promise<boolean>;
};

/**
 * Painel de cadastro e edicao de conta (caixa, reserva ou cartao), no formato
 * do cadastro de categoria: previa no topo, cor escolhida na paleta do app.
 */
export default function ContaFormModal({
  visivel,
  conta,
  onFechar,
  onSalvar,
}: ContaFormModalProps): React.ReactNode {
  const { corCategoria, sharedStyles } = useTheme();
  const styles = useStyles();
  const [nome, setNome] = useState(conta?.nome ?? '');
  const [tipo, setTipo] = useState<TipoConta>(conta?.tipo ?? 'caixa');
  const [cor, setCor] = useState(conta?.cor ?? '');
  const [diaFechamento, setDiaFechamento] = useState(
    conta?.dia_fechamento ? String(conta.dia_fechamento) : '',
  );
  const [diaVencimento, setDiaVencimento] = useState(
    conta?.dia_vencimento ? String(conta.dia_vencimento) : '',
  );
  const [metaValor, setMetaValor] = useState(conta?.meta_valor ? String(conta.meta_valor) : '');
  // No cartao o campo some, mas o valor gravado continua no estado e volta intacto.
  const [saldoInicial, setSaldoInicial] = useState(conta ? String(conta.saldo_inicial) : '');
  const [salvando, setSalvando] = useState(false);
  /** Os lancamentos ja gravados dependem do tipo: so muda numa conta sem nenhum. */
  const tipoTravado = conta !== null && !podeMudarTipo(conta);

  const corDoTipo = (valor: TipoConta): string => corCategoria(COR_PADRAO_TIPO_CONTA[valor]);

  const salvar = (): void => {
    void (async (): Promise<void> => {
      setSalvando(true);
      const salvou = await onSalvar(
        { nome, tipo, cor, diaFechamento, diaVencimento, metaValor, saldoInicial },
        conta,
      );
      setSalvando(false);

      if (salvou) {
        onFechar();
      }
    })();
  };

  return (
    <BottomSheet
      visivel={visivel}
      onFechar={onFechar}
      titulo={conta ? 'Editar conta' : 'Nova conta'}
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button label="Salvar" icon="checkmark" loading={salvando} flex onPress={salvar} />
        </View>
      }
    >
      <View style={styles.previa}>
        <ContaIcone conta={{ tipo, cor: cor || null, ativo: 1 }} tamanho={56} />
        <Text style={sharedStyles.sectionTitle} numberOfLines={1}>
          {nome.trim() || 'Nova conta'}
        </Text>
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Nome da conta *</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex.: Conta corrente, Reserva de emergência"
          value={nome}
          onChangeText={setNome}
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Tipo</Text>
        {tipoTravado ? (
          <Text style={sharedStyles.sectionHint}>
            {`${ROTULO_TIPO_CONTA[tipo]} · ${
              conta?.id === CONTA_CAIXA_PADRAO
                ? 'o caixa padrão recebe os lançamentos sem conta e é sempre caixa'
                : 'o tipo não muda depois que a conta tem lançamentos'
            }`}
          </Text>
        ) : (
          <SegmentedControl
            opcoes={[
              { valor: 'caixa' as const, rotulo: 'Caixa', cor: corDoTipo('caixa') },
              { valor: 'reserva' as const, rotulo: 'Reserva', cor: corDoTipo('reserva') },
              { valor: 'cartao' as const, rotulo: 'Cartão', cor: corDoTipo('cartao') },
            ]}
            valor={tipo}
            onChange={setTipo}
          />
        )}
      </View>

      {tipo === 'cartao' ? (
        <>
          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>Dia de fechamento *</Text>
            <BrazilianIntegerInput
              style={sharedStyles.input}
              placeholder="Ex.: 30"
              value={diaFechamento}
              onChangeValue={setDiaFechamento}
              decimalScale={0}
              keyboardType="number-pad"
            />
          </View>

          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>Dia de vencimento *</Text>
            <BrazilianIntegerInput
              style={sharedStyles.input}
              placeholder="Ex.: 10"
              value={diaVencimento}
              onChangeValue={setDiaVencimento}
              decimalScale={0}
              keyboardType="number-pad"
            />
          </View>
        </>
      ) : null}

      {tipo === 'reserva' ? (
        <View style={sharedStyles.formGroup}>
          <Text style={sharedStyles.label}>Meta de acumulação</Text>
          <BrazilianIntegerInput
            style={sharedStyles.input}
            placeholder="Opcional, ex.: 5.000,00"
            value={metaValor}
            onChangeValue={setMetaValor}
            decimalScale={2}
            keyboardType="number-pad"
          />
        </View>
      ) : null}

      {tipo !== 'cartao' ? (
        <View style={sharedStyles.formGroup}>
          <Text style={sharedStyles.label}>Saldo inicial</Text>
          <BrazilianIntegerInput
            style={sharedStyles.input}
            placeholder="0,00"
            value={saldoInicial}
            onChangeValue={setSaldoInicial}
            decimalScale={2}
            keyboardType="number-pad"
          />
          <Text style={[sharedStyles.sectionHint, styles.dica]}>
            Quanto já havia na conta antes do primeiro lançamento no app.
          </Text>
        </View>
      ) : null}

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Cor</Text>
        <SeletorCor valor={cor || null} onChange={setCor} />
      </View>
    </BottomSheet>
  );
}

const useStyles = makeStyles(() => ({
  previa: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  dica: {
    marginTop: spacing.xs,
  },
}));
