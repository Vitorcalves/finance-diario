import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { type CompositeNavigationProp, useNavigation } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import {
  Aparecer,
  EmptyState,
  Fab,
  LoadingState,
  PressableScale,
  ScreenHeader,
  Text,
} from '../../components/ui';
import type { HomeStackParamList, RootTabParamList } from '../../routes/types';
import { fontSize, fontWeight, iconSize, makeStyles, spacing, useTheme } from '../../theme';
import AtalhosRapidos from './components/AtalhosRapidos';
import ListaLancamentos from './components/ListaLancamentos';
import NovoLancamentoForm from './components/NovoLancamentoForm';
import ResumoTotais from './components/ResumoTotais';
import { useHome } from './useHome';

type HomeNavigation = CompositeNavigationProp<
  NativeStackNavigationProp<HomeStackParamList, 'HomeMain'>,
  BottomTabNavigationProp<RootTabParamList>
>;

/** Ex.: "Quarta, 30 de setembro". */
const dataPorExtenso = (): string => {
  const texto = dayjs().locale('pt-br').format('dddd, D [de] MMMM');
  return texto.charAt(0).toUpperCase() + texto.slice(1);
};

/** Tela inicial: saldo, atalhos, novo lancamento e os lancamentos dia a dia. */
export default function HomeView(): React.ReactNode {
  const { colors, sharedStyles } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation<HomeNavigation>();
  const [formAberto, setFormAberto] = useState(false);
  const {
    loading,
    atualizando,
    atualizar,
    secoes,
    resumo,
    itensPorTransacao,
    nomeEmpresa,
    categorias,
    categoriaPorId,
    definirCategoria,
    adicionarLancamento,
    excluir,
    restaurar,
  } = useHome();

  const abrirBusca = (): void => navigation.navigate('BuscaLancamentos');

  const cabecalhoLista = (
    <View style={styles.cabecalhoLista}>
      <ResumoTotais resumo={resumo} />

      <Aparecer atraso={80}>
        <AtalhosRapidos
          atalhos={[
            {
              rotulo: 'Lista',
              icone: 'cart-outline',
              onPress: (): void => navigation.navigate('ListaCompras'),
            },
            {
              rotulo: 'Orçamento',
              icone: 'clipboard-outline',
              onPress: (): void => navigation.navigate('Dashboard', { screen: 'Orcamento' }),
            },
            {
              rotulo: 'Assinaturas',
              icone: 'repeat-outline',
              onPress: (): void => navigation.navigate('Menu', { screen: 'Planos' }),
            },
            {
              rotulo: 'Preços',
              icone: 'pricetags-outline',
              onPress: (): void => navigation.navigate('Dashboard', { screen: 'HistoricoPrecos' }),
            },
          ]}
        />
      </Aparecer>

      {secoes.length > 0 && (
        <View style={styles.tituloLista}>
          <View style={styles.tituloTextos}>
            <Text style={sharedStyles.sectionTitle}>Lançamentos</Text>
            <Text style={sharedStyles.sectionHint}>Arraste para o lado: categoria ou excluir</Text>
          </View>
          <Pressable
            onPress={abrirBusca}
            hitSlop={spacing.sm}
            accessibilityRole="button"
            accessibilityLabel="Ver todos os lançamentos"
          >
            <Text style={styles.verTodos}>Ver todos</Text>
          </Pressable>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={sharedStyles.screen}>
      <ScreenHeader
        title="Finance Diário"
        subtitle={dataPorExtenso()}
        right={
          <PressableScale
            style={sharedStyles.headerAction}
            onPress={abrirBusca}
            escala={0.9}
            accessibilityRole="button"
            accessibilityLabel="Buscar lançamentos"
          >
            <Ionicons name="search" size={iconSize.md} color={colors.textStrong} />
          </PressableScale>
        }
      />

      {loading ? (
        <LoadingState message="Carregando seus dados..." />
      ) : (
        <ListaLancamentos
          secoes={secoes}
          itensPorTransacao={itensPorTransacao}
          nomeEmpresa={nomeEmpresa}
          categorias={categorias}
          categoriaPorId={categoriaPorId}
          excluir={excluir}
          restaurar={restaurar}
          definirCategoria={definirCategoria}
          ListHeaderComponent={cabecalhoLista}
          ListEmptyComponent={
            <EmptyState
              icon="receipt-outline"
              message="Nenhum lançamento ainda"
              hint="Toque no + para registrar o primeiro gasto ou entrada."
            />
          }
          contentContainerStyle={styles.conteudo}
          atualizando={atualizando}
          onAtualizar={atualizar}
        />
      )}

      <Fab onPress={(): void => setFormAberto(true)} accessibilityLabel="Novo lançamento" />

      <NovoLancamentoForm
        visivel={formAberto}
        onFechar={(): void => setFormAberto(false)}
        onAddLancamento={adicionarLancamento}
      />
    </SafeAreaView>
  );
}

const useStyles = makeStyles((colors) => ({
  conteudo: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    // Espaco para o ultimo lancamento nao ficar atras do botao flutuante.
    paddingBottom: 96,
  },
  cabecalhoLista: {
    gap: spacing.lg,
  },
  tituloLista: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  tituloTextos: {
    flex: 1,
    gap: 2,
  },
  verTodos: {
    fontSize: fontSize.body,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
}));
