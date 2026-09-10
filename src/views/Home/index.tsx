import { StatusBar } from 'expo-status-bar';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { KeyboardAvoidingScreen, LoadingState, ScreenHeader } from '../../components/ui';
import { sharedStyles } from '../../theme';
import ListaTransacoes from './components/ListaTransacoes';
import NovoLancamentoForm from './components/NovoLancamentoForm';
import ResumoTotais from './components/ResumoTotais';
import { useHome } from './useHome';
import React from 'react';

/** Tela inicial: totais, novo lancamento e historico do dia a dia. */
export default function HomeView(): React.ReactNode {
  const {
    loading,
    transacoes,
    mediaDiariaGastos,
    projecaoGastoMes,
    saldoAtual,
    comprometidoFuturo,
    itensPorTransacao,
    nomeEmpresa,
    adicionarLancamento,
    removerTransacao,
  } = useHome();

  if (loading) {
    return (
      <SafeAreaView style={sharedStyles.screen}>
        <StatusBar style="dark" />
        <LoadingState message="Carregando dados..." />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader
        title="Finance Diario"
        subtitle="Controle simples dos seus gastos dia apos dia"
      />

      <KeyboardAvoidingScreen>
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <ResumoTotais
            mediaDiariaGastos={mediaDiariaGastos}
            projecaoGastoMes={projecaoGastoMes}
            saldoAtual={saldoAtual}
            comprometidoFuturo={comprometidoFuturo}
          />

          <NovoLancamentoForm onAddLancamento={adicionarLancamento} />

          <ListaTransacoes
            transacoes={transacoes}
            itensPorTransacao={itensPorTransacao}
            nomeEmpresa={nomeEmpresa}
            onRemover={removerTransacao}
          />
        </ScrollView>
      </KeyboardAvoidingScreen>
    </SafeAreaView>
  );
}
