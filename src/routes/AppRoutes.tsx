import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import TabIcon from '../components/TabIcon';
import HomeView from '../views/HomeView';
import MenuNavigationView from '../views/MenuNavigationView';
import MensalView from '../views/MensalView';
import ProdutosListView from '../views/ProdutosListView';
import ProdutoFormView from '../views/ProdutoFormView';
import CategoriasView from '../views/CategoriasView';
import EmpresasView from '../views/EmpresasView';
import MarcasView from '../views/MarcasView';
import HistoricoPrecosView from '../views/HistoricoPrecosView';
import OrcamentoView from '../views/OrcamentoView';
import type {MenuStackParamList, ProdutosStackParamList, RootTabParamList} from './types';
import {colors} from '../theme';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<MenuStackParamList>();
const ProdutosStackNav = createNativeStackNavigator<ProdutosStackParamList>();

function MenuStack(): React.ReactNode {
  return (
    <Stack.Navigator screenOptions={{headerShown: false}}>
      <Stack.Screen name="MenuHome" component={MenuNavigationView}/>
      <Stack.Screen name="Categorias" component={CategoriasView}/>
      <Stack.Screen name="Empresas" component={EmpresasView}/>
      <Stack.Screen name="Marcas" component={MarcasView}/>
      <Stack.Screen name="HistoricoPrecos" component={HistoricoPrecosView}/>
      <Stack.Screen name="Orcamento" component={OrcamentoView}/>
    </Stack.Navigator>
  );
}

function ProdutosStack(): React.ReactNode {
  return (
    <ProdutosStackNav.Navigator screenOptions={{headerShown: false}}>
      <ProdutosStackNav.Screen name="ProdutosList" component={ProdutosListView}/>
      <ProdutosStackNav.Screen name="ProdutoForm" component={ProdutoFormView}/>
    </ProdutosStackNav.Navigator>
  );
}

export default function AppRoutes(): React.ReactNode {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Home"
        screenOptions={({route}) => ({
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
          tabBarIcon: ({color, size, focused}) => (
            <TabIcon routeName={route.name} color={color} size={focused ? size + 1 : size}/>
          ),
        })}
      >
        <Tab.Screen
          name="Home"
          component={HomeView}
          options={{title: 'Finance Diario', tabBarLabel: 'Home'}}
        />
        <Tab.Screen
          name="GastosMensais"
          component={MensalView}
          options={{title: 'Gastos Mensais', tabBarLabel: 'Mes'}}
        />
        <Tab.Screen
          name="Produtos"
          component={ProdutosStack}
          options={{title: 'Produtos', tabBarLabel: 'Produtos'}}
        />
        <Tab.Screen
          name="Menu"
          component={MenuStack}
          options={{title: 'Menu', tabBarLabel: 'Menu'}}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
