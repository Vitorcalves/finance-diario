import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { Alert, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LoadingState, ScreenHeader } from '../../components/ui';
import type { MenuStackParamList } from '../../routes/types';
import { sharedStyles } from '../../theme';
import AvisoOrcamento from './components/AvisoOrcamento';
import ComparativoMercados from './components/ComparativoMercados';
import DadosPesquisa from './components/DadosPesquisa';
import ItemOrcamentoCard from './components/ItemOrcamentoCard';
import ItemOrcamentoForm from './components/ItemOrcamentoForm';
import RodapeOrcamento from './components/RodapeOrcamento';
import type { DadosItemOrcamento } from './types';
import { useOrcamento } from './useOrcamento';

type OrcamentoNavigation = NativeStackNavigationProp<MenuStackParamList, 'Orcamento'>;

/** Pesquisa de precos por mercado, sem gerar lancamento financeiro. */
export default function OrcamentoView(): React.ReactNode {
  const navigation = useNavigation<OrcamentoNavigation>();
  const orcamento = useOrcamento();

  const [itemEditIndex, setItemEditIndex] = useState<number | null>(null);
  /** Trocada a cada edicao/salvamento para remontar o mini formulario limpo. */
  const [itemFormKey, setItemFormKey] = useState(0);

  const reiniciarItemForm = (index: number | null): void => {
    setItemEditIndex(index);
    setItemFormKey((atual) => atual + 1);
  };

  const salvarItem = (dados: DadosItemOrcamento): boolean => {
    if (!orcamento.salvarItem(dados, itemEditIndex)) {
      return false;
    }

    reiniciarItemForm(null);
    return true;
  };

  const removerItem = (index: number): void => {
    orcamento.removerItem(index);

    if (itemEditIndex === index) {
      reiniciarItemForm(null);
    }
  };

  const limpar = (): void => {
    orcamento.limpar();
    reiniciarItemForm(null);
  };

  const confirmarLimpeza = (): void => {
    if (orcamento.itens.length === 0) {
      limpar();
      return;
    }

    Alert.alert('Limpar orcamento', 'Deseja descartar os itens deste orcamento?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Limpar', style: 'destructive', onPress: limpar },
    ]);
  };

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader title="Orcamento" onBack={(): void => navigation.goBack()} />

      {orcamento.loading ? (
        <LoadingState />
      ) : (
        <>
          <ScrollView
            style={sharedStyles.scrollArea}
            contentContainerStyle={sharedStyles.scrollContent}
          >
            <AvisoOrcamento />

            <DadosPesquisa
              empresas={orcamento.empresas}
              empresaSelecionada={orcamento.empresaSelecionada}
              onAlternarEmpresa={orcamento.alternarEmpresa}
              data={orcamento.dataOrcamento}
              onTrocarData={orcamento.setDataOrcamento}
              dataInputKey={orcamento.dataInputKey}
            />

            <Text style={sharedStyles.sectionTitle}>Itens do orcamento</Text>

            {orcamento.itens.length === 0 ? (
              <Text style={sharedStyles.inlineEmptyText}>
                Nenhum item adicionado. Escolha produto, variante e o preco visto na gondola.
              </Text>
            ) : (
              orcamento.itens.map((item, index) => (
                <ItemOrcamentoCard
                  key={item.localId}
                  item={item}
                  onEditar={(): void => reiniciarItemForm(index)}
                  onRemover={(): void => removerItem(index)}
                />
              ))
            )}

            <ItemOrcamentoForm
              key={`item-${itemFormKey}`}
              produtos={orcamento.produtos}
              variantes={orcamento.variantes}
              itemInicial={itemEditIndex !== null ? orcamento.itens[itemEditIndex] : null}
              empresaSelecionada={orcamento.empresaSelecionada}
              ultimoPreco={orcamento.ultimoPreco}
              menorPrecoRegistrado={orcamento.menorPrecoRegistrado}
              precoBaseDaVariante={orcamento.precoBaseDaVariante}
              nomeEmpresa={orcamento.nomeEmpresa}
              rotuloVariante={orcamento.rotuloVariante}
              onSalvar={salvarItem}
              onCancelar={(): void => reiniciarItemForm(null)}
            />

            <ComparativoMercados
              mercados={orcamento.comparativo}
              menorTotalCompleto={orcamento.menorTotalCompleto}
              totalDeItens={orcamento.itens.length}
            />
          </ScrollView>

          <RodapeOrcamento
            total={orcamento.totalOrcamento}
            salvando={orcamento.salvando}
            onLimpar={confirmarLimpeza}
            onRegistrar={(): void => {
              void orcamento.registrarPrecos();
            }}
          />
        </>
      )}
    </SafeAreaView>
  );
}
