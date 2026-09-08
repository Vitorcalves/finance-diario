import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { Button, EmptyState, IconButton, LoadingState, ScreenHeader } from '../components/ui';
import { colors, sharedStyles } from '../theme';
import {
  type Empresa,
  deleteEmpresaById,
  insertEmpresa,
  listEmpresas,
  updateEmpresa,
} from '../models/empresas';

export default function EmpresasView(): React.ReactNode {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);

  const [nome, setNome] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [observacao, setObservacao] = useState('');

  useEffect((): (() => void) => {
    let active = true;

    const carregarEmpresas = async (): Promise<void> => {
      try {
        setLoading(true);
        const empresasDoBanco = await listEmpresas();
        if (!active) {
          return;
        }
        setEmpresas(empresasDoBanco);
      } catch (error: unknown) {
        console.error('Erro ao carregar empresas:', error);
        Alert.alert('Erro', 'Nao foi possivel carregar as empresas');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void carregarEmpresas();

    return (): void => {
      active = false;
    };
  }, []);

  const carregarEmpresas = async (): Promise<void> => {
    try {
      setLoading(true);
      const empresasDoBanco = await listEmpresas();
      setEmpresas(empresasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar empresas:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar as empresas');
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = (): void => {
    setNome('');
    setCnpj('');
    setObservacao('');
    setEmpresaEditando(null);
  };

  const fecharFormulario = (): void => {
    setShowForm(false);
    limparFormulario();
  };

  const abrirFormularioNovo = (): void => {
    limparFormulario();
    setShowForm(true);
  };

  const abrirFormularioEdicao = (empresa: Empresa): void => {
    setEmpresaEditando(empresa);
    setNome(empresa.nome);
    setCnpj(empresa.cnpj ?? '');
    setObservacao(empresa.observacao ?? '');
    setShowForm(true);
  };

  const salvarEmpresa = async (): Promise<void> => {
    const nomeLimpo = nome.trim();
    const cnpjLimpo = cnpj.trim();
    const observacaoLimpa = observacao.trim();

    if (!nomeLimpo) {
      Alert.alert('Erro', 'Nome da empresa e obrigatorio');
      return;
    }

    try {
      if (empresaEditando) {
        await updateEmpresa({
          ...empresaEditando,
          nome: nomeLimpo,
          cnpj: cnpjLimpo || undefined,
          observacao: observacaoLimpa || undefined,
        });

        await carregarEmpresas();
        fecharFormulario();
        Alert.alert('Sucesso', 'Empresa atualizada!');
        return;
      }

      await insertEmpresa({
        id: uuidv4(),
        nome: nomeLimpo,
        cnpj: cnpjLimpo || undefined,
        observacao: observacaoLimpa || undefined,
        created_at: new Date().toISOString(),
      });

      await carregarEmpresas();
      fecharFormulario();
      Alert.alert('Sucesso', 'Empresa adicionada!');
    } catch (error: unknown) {
      console.error('Erro ao salvar empresa:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar a empresa');
    }
  };

  const deletarEmpresa = (empresa: Empresa): void => {
    Alert.alert('Confirmar exclusao', `Deseja deletar "${empresa.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: (): void => {
          void (async (): Promise<void> => {
            try {
              await deleteEmpresaById(empresa.id);
              await carregarEmpresas();
              Alert.alert('Sucesso', 'Empresa deletada!');
            } catch (error: unknown) {
              console.error('Erro ao deletar empresa:', error);
              Alert.alert('Erro', 'Nao foi possivel deletar a empresa');
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader title="Empresas" onAdd={abrirFormularioNovo} />

      {loading ? (
        <LoadingState />
      ) : empresas.length === 0 ? (
        <EmptyState
          icon="business-outline"
          message="Nenhuma empresa cadastrada"
          actionLabel="Adicionar Empresa"
          onAction={abrirFormularioNovo}
        />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.listContent}
        >
          {empresas.map((empresa) => (
            <View key={empresa.id} style={sharedStyles.listCard}>
              <View style={sharedStyles.listCardInfo}>
                <Text style={sharedStyles.listCardTitle}>{empresa.nome}</Text>
                {empresa.cnpj ? (
                  <Text style={sharedStyles.listCardDetail}>CNPJ: {empresa.cnpj}</Text>
                ) : null}
                {empresa.observacao ? (
                  <Text style={sharedStyles.listCardDetail}>Obs: {empresa.observacao}</Text>
                ) : null}
              </View>

              <View style={sharedStyles.iconButtonRow}>
                <IconButton
                  icon="pencil"
                  variant="primary"
                  onPress={(): void => abrirFormularioEdicao(empresa)}
                />
                <IconButton
                  icon="trash"
                  variant="danger"
                  onPress={(): void => deletarEmpresa(empresa)}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" transparent={false}>
        <SafeAreaView style={sharedStyles.screen}>
          <ScreenHeader
            title={empresaEditando ? 'Editar Empresa' : 'Nova Empresa'}
            backIcon="close"
            onBack={fecharFormulario}
          />

          <ScrollView
            style={sharedStyles.scrollArea}
            contentContainerStyle={sharedStyles.formContent}
          >
            <View style={sharedStyles.formGroup}>
              <Text style={sharedStyles.label}>Nome da Empresa *</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Ex: Mercado Central"
                value={nome}
                onChangeText={setNome}
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={sharedStyles.formGroup}>
              <Text style={sharedStyles.label}>CNPJ</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Ex: 00.000.000/0001-00"
                value={cnpj}
                onChangeText={setCnpj}
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={sharedStyles.formGroup}>
              <Text style={sharedStyles.label}>Observacao</Text>
              <TextInput
                style={[sharedStyles.input, sharedStyles.inputMultiline]}
                placeholder="Anotacoes sobre a empresa"
                value={observacao}
                onChangeText={setObservacao}
                placeholderTextColor={colors.placeholder}
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={sharedStyles.actionsRow}>
              <Button
                label={empresaEditando ? 'Salvar Alteracoes' : 'Salvar Empresa'}
                flex
                onPress={(): void => {
                  void salvarEmpresa();
                }}
              />
              <Button label="Cancelar" variant="secondary" flex onPress={fecharFormulario} />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}
