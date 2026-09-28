import { useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import BrazilianIntegerInput from '../../components/BrazilianIntegerInput';
import SeletorMultiplo from '../../components/SeletorMultiplo';
import { Button, KeyboardAvoidingScreen, LoadingState, ScreenHeader } from '../../components/ui';
import type { ProdutosStackParamList } from '../../routes/types';
import { colors, sharedStyles } from '../../theme';
import NomeSimplesForm from './components/NomeSimplesForm';
import SeletorUnidade from './components/SeletorUnidade';
import VarianteCard from './components/VarianteCard';
import VarianteForm from './components/VarianteForm';
import type { DadosVariante } from './types';
import { useProdutoForm } from './useProdutoForm';

type ProdutoFormNavigation = NativeStackNavigationProp<ProdutosStackParamList, 'ProdutoForm'>;
type ProdutoFormRoute = RouteProp<ProdutosStackParamList, 'ProdutoForm'>;

/** Cadastro e edicao de um produto, suas categorias e suas variantes. */
export default function ProdutoFormView(): React.ReactNode {
  const navigation = useNavigation<ProdutoFormNavigation>();
  const route = useRoute<ProdutoFormRoute>();
  const form = useProdutoForm(route.params?.produtoId);

  const [varianteEditIndex, setVarianteEditIndex] = useState<number | null>(null);
  /** Trocada a cada edicao/salvamento para remontar o mini formulario limpo. */
  const [varianteFormKey, setVarianteFormKey] = useState(0);

  const reiniciarVarianteForm = (index: number | null): void => {
    setVarianteEditIndex(index);
    setVarianteFormKey((atual) => atual + 1);
  };

  const salvarVariante = (dados: DadosVariante): void => {
    form.salvarVariante(dados, varianteEditIndex);
    reiniciarVarianteForm(null);
  };

  const removerVariante = (index: number): void => {
    form.removerVariante(index);

    if (varianteEditIndex === index) {
      reiniciarVarianteForm(null);
    }
  };

  const salvarProduto = (): void => {
    void (async (): Promise<void> => {
      if (await form.salvar()) {
        navigation.goBack();
      }
    })();
  };

  if (form.carregando) {
    return (
      <SafeAreaView style={sharedStyles.screen}>
        <StatusBar style="dark" />
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <StatusBar style="dark" />

      <ScreenHeader
        title={form.editando ? 'Editar Produto' : 'Novo Produto'}
        onBack={(): void => navigation.goBack()}
      />

      <KeyboardAvoidingScreen>
        <ScrollView
          style={sharedStyles.scrollArea}
          contentContainerStyle={sharedStyles.formContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>Nome do Produto *</Text>
            <TextInput
              style={sharedStyles.input}
              placeholder="Ex: Arroz"
              value={form.nome}
              onChangeText={form.setNome}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>Preço Base *</Text>
            <BrazilianIntegerInput
              style={sharedStyles.input}
              placeholder="Ex: 10,50"
              value={form.preco}
              onChangeValue={form.setPreco}
              decimalScale={2}
              placeholderTextColor={colors.placeholder}
            />
          </View>

          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>Unidade</Text>
            <SeletorUnidade
              valor={form.unidadeId}
              onSelecionar={form.setUnidadeId}
              apenasPrimarias
            />
          </View>

          <SeletorMultiplo
            label="Categorias"
            opcoes={form.categorias.map((categoria) => ({
              id: categoria.id,
              nome: categoria.nome,
            }))}
            selecionados={form.categoriasSelecionadas}
            onToggle={form.alternarCategoria}
            placeholderBusca="Buscar categoria"
            textoTrigger="Adicionar categoria"
            textoVazio="Nenhuma categoria cadastrada"
            textoNenhumEncontrado="Nenhuma categoria encontrada"
            add
            textoAdicionar="Nova categoria"
            formAdicionar={(fechar): React.ReactNode => (
              <NomeSimplesForm
                placeholder="Nome da categoria"
                onSalvar={form.criarCategoria}
                onCancelar={fechar}
              />
            )}
          />

          <View style={sharedStyles.formGroup}>
            <Text style={sharedStyles.label}>Variantes</Text>

            {form.variantes.length === 0 && (
              <Text style={sharedStyles.inlineEmptyText}>Nenhuma variante adicionada</Text>
            )}

            {form.variantes.map((variante, index) => (
              <VarianteCard
                key={variante.localId}
                variante={variante}
                nomeMarca={form.nomeMarca}
                onEditar={(): void => reiniciarVarianteForm(index)}
                onRemover={(): void => removerVariante(index)}
              />
            ))}

            <VarianteForm
              key={`variante-${varianteFormKey}`}
              marcas={form.marcas}
              varianteInicial={
                varianteEditIndex !== null ? form.variantes[varianteEditIndex] : null
              }
              onSalvar={salvarVariante}
              onCancelar={(): void => reiniciarVarianteForm(null)}
              onCriarMarca={form.criarMarca}
            />
          </View>

          <View style={sharedStyles.actionsRow}>
            <Button label="Salvar Produto" flex onPress={salvarProduto} />
            <Button
              label="Cancelar"
              variant="secondary"
              flex
              onPress={(): void => navigation.goBack()}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingScreen>
    </SafeAreaView>
  );
}
