import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabIcon from '../components/TabIcon';
import HomeView from '../views/HomeView';
import MenuNavigationView from '../views/MenuNavigationView';
import Option2View from '../views/MensalView';
import ProdutosListView from '../views/ProdutosListView';
import ProdutoFormView from '../views/ProdutoFormView';
import CategoriasView from '../views/CategoriasView';
import EmpresasView from '../views/EmpresasView';
import MarcasView from '../views/MarcasView';
import HistoricoPrecosView from '../views/HistoricoPrecosView';
import OrcamentoView from '../views/OrcamentoView';
import type { MenuStackParamList, ProdutosStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<MenuStackParamList>();
const ProdutosStackNav = createNativeStackNavigator<ProdutosStackParamList>();

function MenuStack(): React.ReactNode {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MenuHome" component={MenuNavigationView} />
      <Stack.Screen name="Categorias" component={CategoriasView} />
      <Stack.Screen name="Empresas" component={EmpresasView} />
      <Stack.Screen name="Marcas" component={MarcasView} />
      <Stack.Screen name="HistoricoPrecos" component={HistoricoPrecosView} />
      <Stack.Screen name="Orcamento" component={OrcamentoView} />
    </Stack.Navigator>
  );
}

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
          tabBarActiveTintColor: '#0f7a5b',
          tabBarInactiveTintColor: '#8ba29a',
          tabBarStyle: {
            backgroundColor: '#ffffff',
            borderTopColor: '#deebe4',
            borderTopWidth: 1,
            height: 64,
            paddingBottom: 8,
            paddingTop: 6,
          },
          headerStyle: {
            backgroundColor: '#ffffff',
          },
          headerTintColor: '#0b3d2e',
          headerTitleStyle: {
            fontWeight: '700',
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
          component={Option2View}
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
