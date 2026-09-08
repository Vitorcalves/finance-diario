import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { v4 as uuidv4 } from 'uuid';
import { Button, EmptyState, IconButton, LoadingState, ScreenHeader } from '../components/ui';
import { colors, sharedStyles } from '../theme';
import {
  type Categoria,
  deleteCategoriaById,
  insertCategoria,
  listCategorias,
} from '../models/categorias';

export default function CategoriasView(): React.ReactNode {
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [nome, setNome] = useState('');

  useEffect((): (() => void) => {
    let active = true;

    const carregarCategorias = async (): Promise<void> => {
      try {
        setLoading(true);
        const categoriasDoBanco = await listCategorias();
        if (!active) {
          return;
        }
        setCategorias(categoriasDoBanco);
      } catch (error: unknown) {
        console.error('Erro ao carregar categorias:', error);
        Alert.alert('Erro', 'Nao foi possivel carregar as categorias');
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void carregarCategorias();

    return (): void => {
      active = false;
    };
  }, []);

  const carregarCategorias = async (): Promise<void> => {
    try {
      setLoading(true);
      const categoriasDoBanco = await listCategorias();
      setCategorias(categoriasDoBanco);
    } catch (error: unknown) {
      console.error('Erro ao carregar categorias:', error);
      Alert.alert('Erro', 'Nao foi possivel carregar as categorias');
    } finally {
      setLoading(false);
    }
  };

  const limparFormulario = (): void => {
    setNome('');
  };

  const fecharFormulario = (): void => {
    setShowForm(false);
    limparFormulario();
  };

  const salvarCategoria = async (): Promise<void> => {
    const nomeLimpo = nome.trim();

    if (!nomeLimpo) {
      Alert.alert('Erro', 'Nome da categoria e obrigatorio');
      return;
    }

    try {
      await insertCategoria({
        id: uuidv4(),
        nome: nomeLimpo,
        created_at: new Date().toISOString(),
      });

      await carregarCategorias();
      fecharFormulario();
      Alert.alert('Sucesso', 'Categoria adicionada!');
    } catch (error: unknown) {
      console.error('Erro ao salvar categoria:', error);
      Alert.alert('Erro', 'Nao foi possivel salvar a categoria');
    }
  };

  const deletarCategoria = (categoria: Categoria): void => {
    Alert.alert('Confirmar exclusao', `Deseja deletar "${categoria.nome}"?`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Deletar',
        style: 'destructive',
        onPress: (): void => {
          void (async (): Promise<void> => {
            try {
              await deleteCategoriaById(categoria.id);
              await carregarCategorias();
              Alert.alert('Sucesso', 'Categoria deletada!');
            } catch (error: unknown) {
              console.error('Erro ao deletar categoria:', error);
              Alert.alert('Erro', 'Nao foi possivel deletar a categoria');
            }
          })();
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader title="Categorias" onAdd={(): void => setShowForm(true)} />

      {loading ? (
        <LoadingState />
      ) : categorias.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          message="Nenhuma categoria cadastrada"
          actionLabel="Adicionar Categoria"
          onAction={(): void => setShowForm(true)}
        />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.listContent}
        >
          {categorias.map((categoria) => (
            <View key={categoria.id} style={sharedStyles.listCard}>
              <View style={sharedStyles.listCardInfo}>
                <Text style={sharedStyles.listCardTitle}>{categoria.nome}</Text>
              </View>

              <View style={sharedStyles.iconButtonRow}>
                <IconButton
                  icon="trash"
                  variant="danger"
                  onPress={(): void => deletarCategoria(categoria)}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showForm} animationType="slide" transparent={false}>
        <SafeAreaView style={sharedStyles.screen}>
          <ScreenHeader title="Nova Categoria" backIcon="close" onBack={fecharFormulario} />

          <ScrollView
            style={sharedStyles.scrollArea}
            contentContainerStyle={sharedStyles.formContent}
          >
            <View style={sharedStyles.formGroup}>
              <Text style={sharedStyles.label}>Nome da Categoria *</Text>
              <TextInput
                style={sharedStyles.input}
                placeholder="Ex: Alimentacao"
                value={nome}
                onChangeText={setNome}
                placeholderTextColor={colors.placeholder}
              />
            </View>

            <View style={sharedStyles.actionsRow}>
              <Button
                label="Salvar Categoria"
                flex
                onPress={(): void => {
                  void salvarCategoria();
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
