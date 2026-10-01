import { useState } from 'react';
import { View } from 'react-native';
import { BottomSheet, Button, Text, TextInput } from '../../../components/ui';
import type { Empresa } from '../../../models/empresas';
import { useTheme } from '../../../theme';
import type { DadosEmpresa } from '../useEmpresas';

type EmpresaFormModalProps = {
  visivel: boolean;
  /** Empresa em edicao; `null` abre o formulario em branco. */
  empresa: Empresa | null;
  onFechar: () => void;
  /** Devolve `true` quando a empresa foi salva, o que fecha o painel. */
  onSalvar: (dados: DadosEmpresa, empresa: Empresa | null) => Promise<boolean>;
};

/** Painel de cadastro e edicao de empresa. */
export default function EmpresaFormModal({
  visivel,
  empresa,
  onFechar,
  onSalvar,
}: EmpresaFormModalProps): React.ReactNode {
  const { sharedStyles } = useTheme();
  const [nome, setNome] = useState(empresa?.nome ?? '');
  const [cnpj, setCnpj] = useState(empresa?.cnpj ?? '');
  const [observacao, setObservacao] = useState(empresa?.observacao ?? '');
  const [salvando, setSalvando] = useState(false);

  const salvar = (): void => {
    void (async (): Promise<void> => {
      setSalvando(true);
      const salvou = await onSalvar({ nome, cnpj, observacao }, empresa);
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
      titulo={empresa ? 'Editar empresa' : 'Nova empresa'}
      rodape={
        <View style={sharedStyles.actionsRow}>
          <Button label="Cancelar" variant="secondary" flex onPress={onFechar} />
          <Button label="Salvar" icon="checkmark" loading={salvando} flex onPress={salvar} />
        </View>
      }
    >
      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Nome da empresa *</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex.: Mercado Central"
          value={nome}
          onChangeText={setNome}
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>CNPJ</Text>
        <TextInput
          style={sharedStyles.input}
          placeholder="Ex.: 00.000.000/0001-00"
          value={cnpj}
          onChangeText={setCnpj}
          keyboardType="numbers-and-punctuation"
        />
      </View>

      <View style={sharedStyles.formGroup}>
        <Text style={sharedStyles.label}>Observação</Text>
        <TextInput
          style={[sharedStyles.input, sharedStyles.inputMultiline]}
          placeholder="Anotações sobre a empresa"
          value={observacao}
          onChangeText={setObservacao}
          multiline
          numberOfLines={4}
        />
      </View>
    </BottomSheet>
  );
}
