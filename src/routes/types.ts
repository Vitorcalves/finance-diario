import type { NavigatorScreenParams } from '@react-navigation/native';

export type MenuStackParamList = {
  MenuHome: undefined;
  Categorias: undefined;
  Empresas: undefined;
  Marcas: undefined;
  HistoricoPrecos: undefined;
  Orcamento: undefined;
  Planos: undefined;
  Integracao: undefined;
};

export type DashboardStackParamList = {
  DashboardHome: undefined;
  AnalisePrecos: { produtoId?: string } | undefined;
};

export type ProdutosStackParamList = {
  ProdutosList: undefined;
  ProdutoForm: { produtoId?: string } | undefined;
};

export type RootTabParamList = {
  Home: undefined;
  GastosMensais: undefined;
  Produtos: NavigatorScreenParams<ProdutosStackParamList> | undefined;
  Dashboard: NavigatorScreenParams<DashboardStackParamList> | undefined;
  Menu: NavigatorScreenParams<MenuStackParamList> | undefined;
};
