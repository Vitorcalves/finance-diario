import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '../theme';
import CategoriasView from '../views/Categorias';
import EmpresasView from '../views/Empresas';
import HistoricoPrecosView from '../views/HistoricoPrecos';
import HomeView from '../views/Home';
import IntegracaoView from '../views/Integracao';
import MarcasView from '../views/Marcas';
import MensalView from '../views/Mensal';
import MenuNavigationView from '../views/MenuHome';
import OrcamentoView from '../views/Orcamento';
import PlanosView from '../views/Planos';
import ProdutoFormView from '../views/ProdutoForm';
import ProdutosListView from '../views/ProdutosList';
import TabIcon from './TabIcon';
import type { MenuStackParamList, ProdutosStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const MenuStackNav = createNativeStackNavigator<MenuStackParamList>();
const ProdutosStackNav = createNativeStackNavigator<ProdutosStackParamList>();

/** Cadastros e ferramentas acessados pela aba Menu. */
function MenuStack(): React.ReactNode {
  return (
    <MenuStackNav.Navigator screenOptions={{ headerShown: false }}>
      <MenuStackNav.Screen name="MenuHome" component={MenuNavigationView} />
      <MenuStackNav.Screen name="Categorias" component={CategoriasView} />
      <MenuStackNav.Screen name="Empresas" component={EmpresasView} />
      <MenuStackNav.Screen name="Marcas" component={MarcasView} />
      <MenuStackNav.Screen name="HistoricoPrecos" component={HistoricoPrecosView} />
      <MenuStackNav.Screen name="Orcamento" component={OrcamentoView} />
      <MenuStackNav.Screen name="Planos" component={PlanosView} />
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

export default function AppRoutes(): React.ReactNode {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({ route }) => ({
          // Cada tela ja renderiza o proprio <ScreenHeader />; o header nativo
          // das tabs seria um segundo cabecalho duplicado.
          headerShown: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSubtle,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 0,
            paddingTop: 6,
          },
          tabBarIcon: ({ color, size, focused }) => (
            <TabIcon routeName={route.name} color={color} size={focused ? size + 1 : size} />
          ),
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeView}
          options={{ title: 'Finance Diario', tabBarLabel: 'Home' }}
        />
        <Tab.Screen
          name="GastosMensais"
          component={MensalView}
          options={{ title: 'Gastos Mensais', tabBarLabel: 'Mes' }}
        />
        <Tab.Screen
          name="Produtos"
          component={ProdutosStack}
          options={{ title: 'Produtos', tabBarLabel: 'Produtos' }}
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
