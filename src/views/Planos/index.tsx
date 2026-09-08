import React, { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ScreenHeader } from '../../components/ui';
import { sharedStyles, spacing } from '../../theme';
import AssinaturaFormModal from './components/AssinaturaFormModal';
import PlanoCard from './components/PlanoCard';
import ResumoPlanos from './components/ResumoPlanos';
import { usePlanos } from './usePlanos';

/**
 * Assinaturas e parcelamentos.
 *
 * As parcelas nascem no lancamento da compra (tela inicial); aqui elas apenas
 * aparecem para acompanhamento. As assinaturas sao cadastradas nesta tela.
 */
export default function PlanosView(): React.ReactNode {
  const {
    loading,
    salvando,
    empresas,
    ativos,
    encerrados,
    resumo,
    salvarAssinatura,
    encerrar,
    excluir,
  } = usePlanos();

  const [showForm, setShowForm] = useState(false);

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader
        title="Assinaturas e parcelas"
        subtitle="Gastos que se repetem sozinhos todo mes"
        onAdd={(): void => setShowForm(true)}
      />

      {loading ? (
        <LoadingState message="Carregando planos..." />
      ) : ativos.length === 0 && encerrados.length === 0 ? (
        <EmptyState
          icon="repeat-outline"
          message="Nenhuma assinatura ou parcelamento"
          hint="Cadastre uma assinatura aqui, ou marque 'compra parcelada' ao lancar um gasto."
          actionLabel="Nova assinatura"
          onAction={(): void => setShowForm(true)}
        />
      ) : (
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.scrollContent}
        >
          <ResumoPlanos resumo={resumo} />

          {ativos.length > 0 && (
            <View style={styles.secao}>
              <Text style={sharedStyles.sectionTitle}>Em andamento</Text>
              {ativos.map((item) => (
                <PlanoCard
                  key={item.plano.id}
                  item={item}
                  onEncerrar={(): void => encerrar(item)}
                  onExcluir={(): void => excluir(item)}
                />
              ))}
            </View>
          )}

          {encerrados.length > 0 && (
            <View style={styles.secao}>
              <Text style={sharedStyles.sectionTitle}>Encerrados</Text>
              {encerrados.map((item) => (
                <PlanoCard
                  key={item.plano.id}
                  item={item}
                  onEncerrar={(): void => encerrar(item)}
                  onExcluir={(): void => excluir(item)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      )}

      {showForm && (
        <AssinaturaFormModal
          empresas={empresas}
          salvando={salvando}
          onFechar={(): void => setShowForm(false)}
          onSalvar={salvarAssinatura}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  secao: {
    gap: spacing.sm,
  },
});
