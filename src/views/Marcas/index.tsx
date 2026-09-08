import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, IconButton, LoadingState, ScreenHeader } from '../../components/ui';
import type { Marca } from '../../models/marcas';
import { sharedStyles } from '../../theme';
import MarcaFormModal from './components/MarcaFormModal';
import { useMarcas } from './useMarcas';

/** Cadastro de marcas usadas nas variantes de produto. */
export default function MarcasView(): React.ReactNode {
  const { marcas, loading, salvar, deletar } = useMarcas();
  const [showForm, setShowForm] = useState(false);
  const [marcaEditando, setMarcaEditando] = useState<Marca | null>(null);

  const abrirFormulario = (marca: Marca | null): void => {
    setMarcaEditando(marca);
    setShowForm(true);
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

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

      {showForm && (
        <MarcaFormModal
          marca={marcaEditando}
          onFechar={(): void => setShowForm(false)}
          onSalvar={salvar}
        />
      )}
    </SafeAreaView>
  );
}
