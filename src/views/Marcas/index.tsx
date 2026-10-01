import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, IconButton, LoadingState, ScreenHeader, Text } from '../../components/ui';
import type { Marca } from '../../models/marcas';
import { useTheme } from '../../theme';
import MarcaFormModal from './components/MarcaFormModal';
import { useMarcas } from './useMarcas';

/** Cadastro de marcas usadas nas variantes de produto. */
export default function MarcasView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const { marcas, loading, salvar, deletar } = useMarcas();
  const [showForm, setShowForm] = useState(false);
  /** Nova chave a cada abertura: o formulario nasce limpo. */
  const [formKey, setFormKey] = useState(0);
  const [marcaEditando, setMarcaEditando] = useState<Marca | null>(null);

  const abrirFormulario = (marca: Marca | null): void => {
    setMarcaEditando(marca);
    setFormKey((atual) => atual + 1);
    setShowForm(true);
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader title="Marcas" onAdd={(): void => abrirFormulario(null)} />

      {loading ? (
        <LoadingState />
      ) : marcas.length === 0 ? (
        <EmptyState
          icon="business-outline"
          message="Nenhuma marca cadastrada"
          actionLabel="Adicionar Marca"
          onAction={(): void => abrirFormulario(null)}
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
                  onPress={(): void => abrirFormulario(marca)}
                />
                <IconButton icon="trash" variant="danger" onPress={(): void => deletar(marca)} />
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      <MarcaFormModal
        key={formKey}
        visivel={showForm}
        marca={marcaEditando}
        onFechar={(): void => setShowForm(false)}
        onSalvar={salvar}
      />
    </SafeAreaView>
  );
}
