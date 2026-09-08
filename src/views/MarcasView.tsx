import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, EmptyState, IconButton, LoadingState, ScreenHeader } from '../components/ui';
import { colors, sharedStyles } from '../theme';
import {
  type Marca,
  deleteMarcaById,
  insertMarca,
  listMarcas,
  updateMarca,
} from '../models/marcas';

export default function MarcasView(): React.ReactNode {
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [marcaEditando, setMarcaEditando] = useState<Marca | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const [nome, setNome] = useState('');

  useEffect((): (() => void) => {
    let active = true;

    const carregarMarcas = async (): Promise<void> => {
      try {
        setLoading(true);
        const marcasDoBanco = await listMarcas();
        if (!active) {
          return;
        }
        setMarcas(marcasDoBanco);
      } catch (error: unknown) {
        console.error('Erro ao carregar marcas:', error);
        Alert.alert('Erro', 'Nao foi possivel carregar as marcas');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void carregarMarcas();

    return (): void => {
      active = false;
    };
  }, []);

  const carregarMarcas = async (): Promise<void> => {
    try {
      setLoading(true);
      const marcasDoBanco = await listMarcas();
      setMarcas(marcasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar marcas:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar as marcas');
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = (): void => {
    setNome('');
    setMarcaEditando(null);
  };

  const fecharFormulario = (): void => {
    setShowForm(false);
    limparFormulario();
  };

  const abrirFormularioNovo = (): void => {
    limparFormulario();
    setShowForm(true);
  };

  const abrirFormularioEdicao = (marca: Marca): void => {
    setMarcaEditando(marca);
    setNome(marca.nome);
    setShowForm(true);
  };

  const salvarMarca = async (): Promise<void> => {
    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      Alert.alert('Erro', 'Nome da marca é obrigatório');
      return;
    }

    try {
      if (marcaEditando) {
        await updateMarca({
          ...marcaEditando,
          nome: nomeLimpo,
        });

        await carregarMarcas();
        fecharFormulario();
        Alert.alert('Sucesso', 'Marca atualizada!');
        return;
      }

      await insertMarca({
        nome: nomeLimpo,
        created_at: new Date().toISOString(),
      });

      await carregarMarcas();
      fecharFormulario();
      Alert.alert('Sucesso', 'Marca adicionada!');
    } catch (error: unknown) {
      console.error('Erro ao salvar marca:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar a marca');
    }
  };

  const deletarMarca = (marca: Marca): void => {
    Alert.alert('Confirmar exclusao', `Deseja deletar "${marca.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: (): void => {
          void (async (): Promise<void> => {
            try {
              await deleteMarcaById(marca.id);
              await carregarMarcas();
              Alert.alert('Sucesso', 'Marca deletada!');
            } catch (error: unknown) {
              console.error('Erro ao deletar marca:', error);
              Alert.alert('Erro', 'Nao foi possivel deletar a marca');
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader title="Marcas" onAdd={abrirFormularioNovo} />

      {loading ? (
        <LoadingState />
      ) : marcas.length === 0 ? (
        <EmptyState
          icon="business-outline"
          message="Nenhuma marca cadastrada"
          actionLabel="Adicionar Marca"
          onAction={abrirFormularioNovo}
        />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.listContent}
        >
          {marcas.map((marca) => (
            <View key={marca.id} style={sharedStyles.listCard}>
              <View style={sharedStyles.listCardInfo}>
                <Text style={sharedStyles.listCardTitle}>{marca.nome}</Text>
              </View>

              <View style={sharedStyles.iconButtonRow}>
                <IconButton
                  icon="pencil"
                  variant="primary"
                  onPress={(): void => abrirFormularioEdicao(marca)}
                />
                <IconButton
                  icon="trash"
                  variant="danger"
                  onPress={(): void => deletarMarca(marca)}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" transparent={false}>
        <SafeAreaView style={sharedStyles.screen}>
          <ScreenHeader
            title={marcaEditando ? 'Editar Marca' : 'Nova Marca'}
            backIcon="close"
            onBack={fecharFormulario}
          />

          <ScrollView
            style={sharedStyles.scrollArea}
            contentContainerStyle={sharedStyles.formContent}
          >
            <View style={sharedStyles.formGroup}>
              <Text style={sharedStyles.label}>Nome da Marca *</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Ex: Mercado Central"
                value={nome}
                onChangeText={setNome}
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={sharedStyles.actionsRow}>
              <Button
                label={marcaEditando ? 'Salvar Alteracoes' : 'Salvar Marca'}
                flex
                onPress={(): void => {
                  void salvarMarca();
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
