import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import Ionicons from '@expo/vector-icons/Ionicons';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
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
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.header}>
        <Text style={styles.title}>Empresas</Text>
        <Pressable style={styles.addButton} onPress={abrirFormularioNovo}>
          <Ionicons name="add-circle" size={32} color="#0f7a5b" />
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#0f7a5b" />
        </View>
      ) : empresas.length === 0 ? (
        <View style={styles.centerContent}>
          <Ionicons name="business-outline" size={64} color="#8ba29a" />
          <Text style={styles.emptyText}>Nenhuma empresa cadastrada</Text>
          <Pressable style={styles.primaryButton} onPress={abrirFormularioNovo}>
            <Text style={styles.buttonText}>Adicionar Empresa</Text>
          </Pressable>
        </View>
      ) : (
        <ScrollView style={styles.listContainer}>
          {empresas.map((empresa) => (
            <View key={empresa.id} style={styles.card}>
              <View style={styles.info}>
                <Text style={styles.nome}>{empresa.nome}</Text>
                {empresa.cnpj ? <Text style={styles.extraInfo}>CNPJ: {empresa.cnpj}</Text> : null}
                {empresa.observacao ? (
                  <Text style={styles.extraInfo}>Obs: {empresa.observacao}</Text>
                ) : null}
              </View>

              <View style={styles.actionsRow}>
                <Pressable
                  style={[styles.actionButton, styles.editButton]}
                  onPress={() => abrirFormularioEdicao(empresa)}
                >
                  <Ionicons name="create-outline" size={20} color="#1d4ed8" />
                </Pressable>
                <Pressable
                  style={[styles.actionButton, styles.deleteButton]}
                  onPress={() => deletarEmpresa(empresa)}
                >
                  <Ionicons name="trash" size={20} color="#dc2626" />
                </Pressable>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" transparent={false}>
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Pressable onPress={fecharFormulario}>
              <Ionicons name="close" size={32} color="#0b3d2e" />
            </Pressable>
            <Text style={styles.modalTitle}>
              {empresaEditando ? 'Editar Empresa' : 'Nova Empresa'}
            </Text>
            <View style={styles.modalSpacer} />
          </View>

          <ScrollView style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.label}>Nome da Empresa *</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Mercado Central"
                value={nome}
                onChangeText={setNome}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>CNPJ</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: 00.000.000/0001-00"
                value={cnpj}
                onChangeText={setCnpj}
                placeholderTextColor="#9ca3af"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.label}>Observacao</Text>
              <TextInput
                style={[styles.input, styles.inputMultiline]}
                placeholder="Anotacoes sobre a empresa"
                value={observacao}
                onChangeText={setObservacao}
                placeholderTextColor="#9ca3af"
                multiline
                numberOfLines={4}
              />
            </View>

            <View style={styles.formActions}>
              <Pressable
                style={[styles.primaryButton, styles.actionPrimary]}
                onPress={() => {
                  void salvarEmpresa();
                }}
              >
                <Text style={styles.buttonText}>
                  {empresaEditando ? 'Salvar Alteracoes' : 'Salvar Empresa'}
                </Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, styles.actionSecondary]}
                onPress={fecharFormulario}
              >
                <Text style={styles.secondaryButtonText}>Cancelar</Text>
              </Pressable>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#deebe4',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#0b3d2e',
  },
  addButton: {
    padding: 8,
  },
  centerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: '#3e4b46',
  },
  listContainer: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f7f4',
    borderRadius: 8,
    padding: 12,
    marginVertical: 6,
    borderLeftWidth: 4,
    borderLeftColor: '#0f7a5b',
  },
  info: {
    flex: 1,
    paddingRight: 8,
  },
  nome: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0b3d2e',
    marginBottom: 4,
  },
  extraInfo: {
    fontSize: 13,
    color: '#3e4b46',
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  editButton: {
    borderColor: '#bfdbfe',
    backgroundColor: '#eff6ff',
  },
  deleteButton: {
    borderColor: '#fecaca',
    backgroundColor: '#fff5f5',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#deebe4',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0b3d2e',
  },
  modalSpacer: {
    width: 32,
  },
  formContainer: {
    flex: 1,
    padding: 16,
  },
  formGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#17342b',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d6dfdb',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    color: '#17342b',
    backgroundColor: '#ffffff',
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  formActions: {
    flexDirection: 'row',
    marginTop: 10,
  },
  actionPrimary: {
    flex: 1,
  },
  actionSecondary: {
    flex: 1,
    marginLeft: 12,
  },
  primaryButton: {
    backgroundColor: '#0f7a5b',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#ffffff',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d6dfdb',
    backgroundColor: '#ffffff',
  },
  secondaryButtonText: {
    color: '#17342b',
    fontWeight: '700',
    fontSize: 15,
  },
});
