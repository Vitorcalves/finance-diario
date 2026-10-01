import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import type { Empresa } from '../../models/empresas';
import { useTheme } from '../../theme';
import EmpresaCard from './components/EmpresaCard';
import EmpresaFormModal from './components/EmpresaFormModal';
import { useEmpresas } from './useEmpresas';

/** Cadastro de empresas (mercados) usadas nos lancamentos. */
export default function EmpresasView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const { empresas, loading, salvar, deletar } = useEmpresas();
  const [showForm, setShowForm] = useState(false);
  /** Nova chave a cada abertura: o formulario nasce limpo. */
  const [formKey, setFormKey] = useState(0);
  const [empresaEditando, setEmpresaEditando] = useState<Empresa | null>(null);

  const abrirFormulario = (empresa: Empresa | null): void => {
    setEmpresaEditando(empresa);
    setFormKey((atual) => atual + 1);
    setShowForm(true);
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader title="Empresas" onAdd={(): void => abrirFormulario(null)} />

      {loading ? (
        <LoadingState />
      ) : empresas.length === 0 ? (
        <EmptyState
          icon="business-outline"
          message="Nenhuma empresa cadastrada"
          actionLabel="Adicionar Empresa"
          onAction={(): void => abrirFormulario(null)}
        />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.listContent}
        >
          {empresas.map((empresa) => (
            <EmpresaCard
              key={empresa.id}
              empresa={empresa}
              onEditar={(): void => abrirFormulario(empresa)}
              onDeletar={(): void => deletar(empresa)}
            />
          ))}
        </ScrollView>
      )}

      <EmpresaFormModal
        key={formKey}
        visivel={showForm}
        empresa={empresaEditando}
        onFechar={(): void => setShowForm(false)}
        onSalvar={salvar}
      />
    </SafeAreaView>
  );
}
