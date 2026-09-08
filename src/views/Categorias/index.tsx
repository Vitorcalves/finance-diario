import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, IconButton, LoadingState, ScreenHeader } from '../../components/ui';
import { sharedStyles } from '../../theme';
import CategoriaFormModal from './components/CategoriaFormModal';
import { useCategorias } from './useCategorias';

/** Cadastro de categorias de produto. */
export default function CategoriasView(): React.ReactNode {
  const { categorias, loading, salvar, deletar } = useCategorias();
  const [showForm, setShowForm] = useState(false);

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
                  onPress={(): void => deletar(categoria)}
                />
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {showForm && (
        <CategoriaFormModal onFechar={(): void => setShowForm(false)} onSalvar={salvar} />
      )}
    </SafeAreaView>
  );
}
