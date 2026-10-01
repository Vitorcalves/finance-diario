import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import { makeStyles, spacing, useTheme } from '../../theme';
import CategoriaCard from './components/CategoriaCard';
import CategoriaFormModal from './components/CategoriaFormModal';
import { useCategorias } from './useCategorias';

/** Cadastro de categorias de produto. */
export default function CategoriasView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const { categorias, loading, salvar, deletar } = useCategorias();
  const [showForm, setShowForm] = useState(false);
  /** Nova chave a cada abertura: o formulario nasce limpo. */
  const [formKey, setFormKey] = useState(0);

  const abrirFormulario = (): void => {
    setFormKey((atual) => atual + 1);
    setShowForm(true);
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Categorias"
        subtitle={
          categorias.length > 0
            ? `${categorias.length} ${categorias.length === 1 ? 'categoria cadastrada' : 'categorias cadastradas'}`
            : undefined
        }
        onAdd={abrirFormulario}
      />

      {loading ? (
        <LoadingState />
      ) : categorias.length === 0 ? (
        <EmptyState
          icon="albums-outline"
          message="Nenhuma categoria cadastrada"
          actionLabel="Adicionar Categoria"
          onAction={abrirFormulario}
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

      <CategoriaFormModal
        key={formKey}
        visivel={showForm}
        onFechar={(): void => setShowForm(false)}
        onSalvar={salvar}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles(() => ({
  listContent: {
    gap: spacing.sm,
  },
}));
