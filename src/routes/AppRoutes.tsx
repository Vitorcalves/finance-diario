import { useMemo } from 'react';
import { DarkTheme, DefaultTheme, NavigationContainer, type Theme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { fontes, fontSize, useTheme } from '../theme';
import AnalisePrecosView from '../views/AnalisePrecos';
import BuscaLancamentosView from '../views/BuscaLancamentos';
import CategoriasView from '../views/Categorias';
import CategoriasLancamentoView from '../views/CategoriasLancamento';
import ContasView from '../views/Contas';
import DashboardHomeView from '../views/Dashboard';
import EmpresasView from '../views/Empresas';
import FaturasView from '../views/Faturas';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HistoricoPrecosView from '../views/HistoricoPrecos';
import HomeView from '../views/Home';
import IntegracaoView from '../views/Integracao';
import ListaComprasView from '../views/ListaCompras';
import MarcasView from '../views/Marcas';
import MensalView from '../views/Mensal';
import MenuNavigationView from '../views/MenuHome';
import NotasLancamentoView from '../views/NotasLancamento';
import OrcamentoView from '../views/Orcamento';
import PlanosView from '../views/Planos';
import ProdutoFormView from '../views/ProdutoForm';
import ProdutosListView from '../views/ProdutosList';
import TabIcon from './TabIcon';
import type {
  DashboardStackParamList,
  HomeStackParamList,
  MenuStackParamList,
  ProdutosStackParamList,
  RootTabParamList,
} from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStackNav = createNativeStackNavigator<HomeStackParamList>();
const MenuStackNav = createNativeStackNavigator<MenuStackParamList>();
const ProdutosStackNav = createNativeStackNavigator<ProdutosStackParamList>();
const DashboardStackNav = createNativeStackNavigator<DashboardStackParamList>();

/** Home, busca de lancamentos e lista de compras. */
function HomeStack(): React.ReactNode {
  return (
    <HomeStackNav.Navigator screenOptions={{ headerShown: false }}>
      <HomeStackNav.Screen name="HomeMain" component={HomeView} />
      <HomeStackNav.Screen name="BuscaLancamentos" component={BuscaLancamentosView} />
      <HomeStackNav.Screen name="ListaCompras" component={ListaComprasView} />
      <HomeStackNav.Screen name="NotasLancamento" component={NotasLancamentoView} />
    </HomeStackNav.Navigator>
  );
}

/** Cadastros, financeiro e sistema acessados pela aba Menu. */
function MenuStack(): React.ReactNode {
  return (
    <MenuStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MenuStackNav.Screen name="MenuHome" component={MenuNavigationView} />
      <MenuStackNav.Screen name="Categorias" component={CategoriasView} />
      <MenuStackNav.Screen name="Empresas" component={EmpresasView} />
      <MenuStackNav.Screen name="Marcas" component={MarcasView} />
      <MenuStackNav.Screen name="CategoriasLancamento" component={CategoriasLancamentoView} />
      <MenuStackNav.Screen name="Planos" component={PlanosView} />
      <MenuStackNav.Screen name="Contas" component={ContasView} />
      <MenuStackNav.Screen name="Faturas" component={FaturasView} />
      <MenuStackNav.Screen name="Integracao" component={IntegracaoView} />
    </MenuStackNav.Navigator>
  );
}

/** Lista e formulario de produtos. */
function ProdutosStack(): React.ReactNode {
  return (
    <ProdutosStackNav.Navigator screenOptions={{ headerShown: false }}>
      <ProdutosStackNav.Screen name="ProdutosList" component={ProdutosListView} />
      <ProdutosStackNav.Screen name="ProdutoForm" component={ProdutoFormView} />
    </ProdutosStackNav.Navigator>
  );
}

/** Aba Analises: hub com as telas de precos e cada uma delas. */
function DashboardStack(): React.ReactNode {
  return (
    <DashboardStackNav.Navigator screenOptions={{ headerShown: false }}>
      <DashboardStackNav.Screen name="DashboardHome" component={DashboardHomeView} />
      <DashboardStackNav.Screen name="AnalisePrecos" component={AnalisePrecosView} />
      <DashboardStackNav.Screen name="HistoricoPrecos" component={HistoricoPrecosView} />
      <DashboardStackNav.Screen name="Orcamento" component={OrcamentoView} />
    </DashboardStackNav.Navigator>
  );
}

export default function AppRoutes(): React.ReactNode {
  const { colors, escuro, fontesCarregadas } = useTheme();
  const insets = useSafeAreaInsets();

  /** Fundo das transicoes e cores padrao da navegacao seguem o tema do app. */
  const temaNavegacao = useMemo((): Theme => {
    const base = escuro ? DarkTheme : DefaultTheme;

    return {
      ...base,
      colors: {
        ...base.colors,
        primary: colors.primary,
        background: colors.background,
        card: colors.surface,
        text: colors.textStrong,
        border: colors.border,
        notification: colors.danger,
      },
      fonts: fontesCarregadas
        ? {
            regular: { fontFamily: fontes.regular, fontWeight: 'normal' },
            medium: { fontFamily: fontes.medium, fontWeight: 'normal' },
            bold: { fontFamily: fontes.bold, fontWeight: 'normal' },
            heavy: { fontFamily: fontes.heavy, fontWeight: 'normal' },
          }
        : base.fonts,
    };
  }, [colors, escuro, fontesCarregadas]);

  return (
    <NavigationContainer theme={temaNavegacao}>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarLabelStyle: {
            fontSize: fontSize.micro,
            fontFamily: fontesCarregadas ? fontes.medium : undefined,
          },
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            // Altura desejada + espaço dos botões do sistema (0 no modo gestos).
            height: 64 + insets.bottom,
            // Empurra o conteúdo da tab bar para cima da área dos botões.
            paddingBottom: insets.bottom,
            paddingTop: 6,
          },
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon routeName={route.name} color={color} size={size} focused={focused} />
          ),
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeStack}
          options={{ title: 'Finance Diário', tabBarLabel: 'Início' }}
        />
        <Tab.Screen
          name="GastosMensais"
          component={MensalView}
          options={{ title: 'Gastos do mês', tabBarLabel: 'Mês' }}
        />
        <Tab.Screen
          name="Produtos"
          component={ProdutosStack}
          options={{ title: 'Produtos', tabBarLabel: 'Produtos' }}
        />
        <Tab.Screen
          name="Dashboard"
          component={DashboardStack}
          options={{ title: 'Análises', tabBarLabel: 'Análises' }}
        />
        <Tab.Screen
          name="Menu"
          component={MenuStack}
          options={{ title: 'Menu', tabBarLabel: 'Menu' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
