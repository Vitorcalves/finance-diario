import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { RootTabParamList } from '../routes/types';

type TabName = keyof RootTabParamList;

type TabIconProps = {
  routeName: TabName;
  color: string;
  size: number;
};

const iconByRoute: Record<TabName, ComponentProps<typeof Ionicons>['name']> = {
  Home: 'home',
  GastosMensais: 'calendar',
  Option3: 'ellipse-outline',
  Menu: 'menu',
};

export default function TabIcon({ routeName, color, size }: TabIconProps) {
  return <Ionicons name={iconByRoute[routeName]} color={color} size={size} />;
}
