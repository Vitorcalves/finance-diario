import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TabIcon from '../components/TabIcon';
import HomeView from '../views/HomeView';
import MenuNavigationView from '../views/MenuNavigationView';
import Option2View from '../views/Option2View';
import Option3View from '../views/Option3View';
import type { RootTabParamList } from './types';

const Tab = createBottomTabNavigator<RootTabParamList>();

export default function AppRoutes() {
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
            <TabIcon
              routeName={route.name as keyof RootTabParamList}
              color={color}
              size={focused ? size + 1 : size}
            />
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
          name="Option3"
          component={Option3View}
          options={{ title: 'Opcao 3', tabBarLabel: 'Opcao 3' }}
        />
        <Tab.Screen
          name="Menu"
          component={MenuNavigationView}
          options={{ title: 'Menu', tabBarLabel: 'Menu' }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
