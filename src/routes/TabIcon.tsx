import Ionicons from '@expo/vector-icons/Ionicons';
import type { ComponentProps } from 'react';
import type { RootTabParamList } from './types';

type TabName = keyof RootTabParamList;

type IconName = ComponentProps<typeof Ionicons>['name'];

type TabIconProps = {
  routeName: TabName;
  color: string;
  size: number;
  focused: boolean;
};

/** Icone cheio na aba ativa e vazado nas demais. */
const iconByRoute: Record<TabName, { ativo: IconName; inativo: IconName }> = {
  Home: { ativo: 'home', inativo: 'home-outline' },
  GastosMensais: { ativo: 'calendar', inativo: 'calendar-outline' },
  Produtos: { ativo: 'cube', inativo: 'cube-outline' },
  Dashboard: { ativo: 'analytics', inativo: 'analytics-outline' },
  Menu: { ativo: 'grid', inativo: 'grid-outline' },
};

export default function TabIcon({
  routeName,
  color,
  size,
  focused,
}: TabIconProps): React.ReactNode {
  const icones = iconByRoute[routeName];
  return <Ionicons name={focused ? icones.ativo : icones.inativo} color={color} size={size} />;
}
