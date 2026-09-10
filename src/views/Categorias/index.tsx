import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import { sharedStyles, spacing } from '../../theme';
import CategoriaCard from './components/CategoriaCard';
import CategoriaFormModal from './components/CategoriaFormModal';
import { useCategorias } from './useCategorias';

/** Cadastro de categorias de produto. */
export default function CategoriasView(): React.ReactNode {
  const { categorias, loading, salvar, deletar } = useCategorias();
  const [showForm, setShowForm] = useState(false);

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader
        title="Categorias"
        subtitle={
          categorias.length > 0
            ? `${categorias.length} ${categorias.length === 1 ? 'categoria cadastrada' : 'categorias cadastradas'}`
            : undefined
        }
        onAdd={(): void => setShowForm(true)}
      />

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
          contentContainerStyle={[sharedStyles.listContent, styles.listContent]}
        >
          {categorias.map((categoria) => (
            <CategoriaCard
              key={categoria.id}
              categoria={categoria}
              onDeletar={(): void => deletar(categoria)}
            />
          ))}
        </ScrollView>
      )}

      {showForm && (
        <CategoriaFormModal onFechar={(): void => setShowForm(false)} onSalvar={salvar} />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  listContent: {
    gap: spacing.sm,
  },
});
