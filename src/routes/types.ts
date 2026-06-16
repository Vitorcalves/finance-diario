import type { NavigatorScreenParams } from '@react-navigation/native';

export type MenuStackParamList = {
  MenuHome: undefined;
  Categorias: undefined;
  Empresas: undefined;
  Marcas: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  GastosMensais: undefined;
  Produtos: undefined;
  Menu: NavigatorScreenParams<MenuStackParamList> | undefined;
};
