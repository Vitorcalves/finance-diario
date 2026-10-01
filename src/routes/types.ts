import type { NavigatorScreenParams } from '@react-navigation/native';

/** Cadastros, financeiro e sistema, acessados pela aba Menu. */
export type MenuStackParamList = {
  MenuHome: undefined;
  Categorias: undefined;
  Empresas: undefined;
  Marcas: undefined;
  Planos: undefined;
  Integracao: undefined;
};

/** Aba Analises: hub e as telas de consulta de precos. */
export type DashboardStackParamList = {
  DashboardHome: undefined;
  AnalisePrecos: { produtoId?: string } | undefined;
  HistoricoPrecos: undefined;
  Orcamento: undefined;
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
