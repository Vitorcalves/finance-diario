import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import TabIcon from '../components/TabIcon';
import HomeView from '../views/HomeView';
import MenuNavigationView from '../views/MenuNavigationView';
import Option2View from '../views/MensalView';
import ProdutosView from '../views/ProdutosView';
import CategoriasView from '../views/CategoriasView';
import type { MenuStackParamList, RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();
const Stack = createNativeStackNavigator<MenuStackParamList>();

function MenuStack(): React.ReactNode {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MenuHome" component={MenuNavigationView} />
      <Stack.Screen name="Categorias" component={CategoriasView} />
    </Stack.Navigator>
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
          component={ProdutosView}
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
