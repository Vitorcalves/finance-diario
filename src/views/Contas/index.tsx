import { useState } from 'react';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import type { ContaComSaldo } from '../../models/contas';
import type { MenuStackParamList } from '../../routes/types';
import { useTheme } from '../../theme';
import ContaCard from './components/ContaCard';
import ContaFormModal from './components/ContaFormModal';
import { useContas } from './useContas';

type NavegacaoContas = NativeStackNavigationProp<MenuStackParamList, 'Contas'>;

/**
 * Cadastro de contas: caixas, reservas de investimento e cartoes de credito.
 * Compras no cartao sao vistas nas faturas dele; aportes e resgates sao
 * transferencias entre contas, nao gasto nem receita.
 */
export default function ContasView(): React.ReactNode {
  const { sharedStyles } = useTheme();
  const { contas, loading, salvar, remover } = useContas();
  const navigation = useNavigation<NavegacaoContas>();
  const [showForm, setShowForm] = useState(false);
  /** Nova chave a cada abertura: o formulario nasce limpo. */
  const [formKey, setFormKey] = useState(0);
  const [contaEditando, setContaEditando] = useState<ContaComSaldo | null>(null);

  const abrirFormulario = (conta: ContaComSaldo | null): void => {
    setContaEditando(conta);
    setFormKey((atual) => atual + 1);
    setShowForm(true);
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Contas"
        subtitle="Caixas, reservas e cartões"
        onAdd={(): void => abrirFormulario(null)}
      />

      {loading ? (
        <LoadingState />
      ) : contas.length === 0 ? (
        <EmptyState
          icon="wallet-outline"
          message="Nenhuma conta cadastrada"
          actionLabel="Adicionar conta"
          onAction={(): void => abrirFormulario(null)}
        />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.listContent}
        >
          {contas.map((conta) => (
            <ContaCard
              key={conta.id}
              conta={conta}
              onEditar={(): void => abrirFormulario(conta)}
              onRemover={(): void => remover(conta)}
              onVerFaturas={
                conta.tipo === 'cartao'
                  ? (): void => navigation.navigate('Faturas', { contaId: conta.id })
                  : undefined
              }
            />
          ))}
        </ScrollView>
      )}

      <ContaFormModal
        key={formKey}
        visivel={showForm}
        conta={contaEditando}
        onFechar={(): void => setShowForm(false)}
        onSalvar={salvar}
      />
    </SafeAreaView>
  );
}
