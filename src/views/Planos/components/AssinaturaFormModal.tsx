import React, { useState } from 'react';
import { Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import dayjs from 'dayjs';
import BrazilianDateInput from '../../../components/BrazilianDateInput';
import BrazilianIntegerInput from '../../../components/BrazilianIntegerInput';
import SeletorMultiplo from '../../../components/SeletorMultiplo';
import { Button, ChipSelector, ScreenHeader } from '../../../components/ui';
import type { Empresa } from '../../../models/empresas';
import { colors, sharedStyles } from '../../../theme';
import { type FrequenciaPlano, ROTULO_FREQUENCIA } from '../../../utils/parcelas';
import type { DadosFormularioAssinatura } from '../types';

const FREQUENCIAS: FrequenciaPlano[] = ['semanal', 'mensal', 'anual'];

type AssinaturaFormModalProps = {
  empresas: Empresa[];
  salvando: boolean;
  onFechar: () => void;
  /** Devolve `true` quando a assinatura foi criada, o que fecha o modal. */
  onSalvar: (dados: DadosFormularioAssinatura) => Promise<boolean>;
};

/** Cadastro de uma assinatura: valor, ritmo e data da primeira cobranca. */
export default function AssinaturaFormModal({
  empresas,
  salvando,
  onFechar,
  onSalvar,
}: AssinaturaFormModalProps): React.ReactNode {
  const [descricao, setDescricao] = useState('');
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [valor, setValor] = useState('');
  const [dataInicio, setDataInicio] = useState(dayjs().format('YYYY-MM-DD'));
  const [frequencia, setFrequencia] = useState<FrequenciaPlano>('mensal');

  const salvar = (): void => {
    void (async (): Promise<void> => {
      const salvou = await onSalvar({
        descricao,
        empresaId,
        valor: Number(valor) || 0,
        dataInicio,
        frequencia,
        intervalo: 1,
      });

      if (salvou) {
        onFechar();
      }
    })();
  };

  return (
    <Modal visible animationType="slide" transparent={false} onRequestClose={onFechar}>
      <SafeAreaView style={sharedStyles.screen}>
        <ScreenHeader title="Nova assinatura" backIcon="close" onBack={onFechar} />

        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.formContent}
        >
          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>Descricao *</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="Ex.: Streaming, academia, plano do celular"
              value={descricao}
              onChangeText={setDescricao}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={sharedStyles.formGroup}>
            <SeletorMultiplo
              label="Empresa"
              opcoes={empresas.map((empresa) => ({ id: empresa.id, nome: empresa.nome }))}
              selecionados={empresaId ? [empresaId] : []}
              onToggle={(id): void => setEmpresaId((atual) => (atual === id ? null : id))}
              placeholderBusca="Buscar empresa"
              textoTrigger="Selecionar empresa"
              textoVazio="Nenhuma empresa cadastrada"
              textoNenhumEncontrado="Nenhuma empresa encontrada"
            />
          </View>

          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>Valor da cobranca (R$) *</Text>
            <BrazilianIntegerInput
              value={valor}
              onChangeValue={setValor}
              decimalScale={2}
              fixedDecimalScale
              placeholder="Ex.: 39,90"
              placeholderTextColor={colors.placeholder}
              style={sharedStyles.input}
            />
          </View>

          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>Frequencia</Text>
            <ChipSelector
              opcoes={FREQUENCIAS.map((opcao) => ({
                valor: opcao,
                rotulo: ROTULO_FREQUENCIA[opcao],
              }))}
              selecionado={frequencia}
              onSelecionar={setFrequencia}
            />
          </View>

          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>1a cobranca (DD/MM/AAAA) *</Text>
            <BrazilianDateInput
              defaultValue={dataInicio}
              onChangeValue={setDataInicio}
              placeholder={dayjs().format('DD/MM/YYYY')}
              placeholderTextColor={colors.placeholder}
              style={sharedStyles.input}
            />
            <Text style={sharedStyles.sectionHint}>
              O dia desta data vira o dia da cobranca em todos os meses seguintes.
            </Text>
          </View>

          <View style={sharedStyles.actionsRow}>
            <Button
              label={salvando ? 'Salvando...' : 'Salvar assinatura'}
              flex
              disabled={salvando}
              onPress={salvar}
            />
            <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
