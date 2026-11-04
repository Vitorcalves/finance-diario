import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EmptyState, LoadingState, ScreenHeader, Text } from '../../components/ui';
import { makeStyles, spacing, useTheme } from '../../theme';
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
  const { sharedStyles } = useTheme();
  const styles = useStyles();
  const {
    loading,
    salvando,
    empresas,
    categorias,
    contas,
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
      <ScreenHeader
        title="Assinaturas e parcelas"
        subtitle="Gastos que se repetem sozinhos todo mês"
        onAdd={(): void => setShowForm(true)}
      />

      {loading ? (
        <LoadingState message="Carregando planos..." />
      ) : ativos.length === 0 && encerrados.length === 0 ? (
        <EmptyState
          icon="repeat-outline"
          message="Nenhuma assinatura ou parcelamento"
          hint="Cadastre uma assinatura aqui, ou marque 'compra parcelada' ao lançar um gasto."
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

      <AssinaturaFormModal
        visivel={showForm}
        empresas={empresas}
        categorias={categorias}
        contas={contas}
        salvando={salvando}
        onFechar={(): void => setShowForm(false)}
        onSalvar={salvarAssinatura}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles(() => ({
  secao: {
    gap: spacing.sm,
  },
}));
