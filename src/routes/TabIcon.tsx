import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { RootTabParamList } from './types';

type TabName = keyof RootTabParamList;

type TabIconProps = {
  routeName: TabName;
  color: string;
  size: number;
};

const iconByRoute: Record<TabName, ComponentProps<typeof Ionicons>['name']> = {
  Home: 'home',
  GastosMensais: 'calendar',
  Produtos: 'ellipse-outline',
  Dashboard: 'analytics',
  Menu: 'menu',
};

export default function TabIcon({ routeName, color, size }: TabIconProps): React.ReactNode {
  return <Ionicons name={iconByRoute[routeName]} color={color} size={size} />;
}
