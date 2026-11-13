import type { NavigatorScreenParams } from '@react-navigation/native';

/** Filtros com que a busca de lancamentos abre (ex.: vinda do grafico de categorias). */
export type FiltrosIniciaisBusca = {
  categoriaId?: string;
  empresaId?: string;
  /** Tag de evento (vinda da tela de Tags). */
  tagId?: string;
  /** Periodo personalizado, YYYY-MM-DD. */
  inicio?: string;
  fim?: string;
};

/** Aba Inicio: a Home e as telas que saem dela. */
export type HomeStackParamList = {
  HomeMain: undefined;
  BuscaLancamentos: FiltrosIniciaisBusca | undefined;
  ListaCompras: undefined;
  NotasLancamento: undefined;
};

/** Cadastros, financeiro e sistema, acessados pela aba Menu. */
export type MenuStackParamList = {
  MenuHome: undefined;
  Categorias: undefined;
  Empresas: undefined;
  Marcas: undefined;
  CategoriasLancamento: undefined;
  Planos: undefined;
  Contas: undefined;
  Faturas: { contaId: string } | undefined;
  Integracao: undefined;
  Tags: undefined;
  /** A mesma busca da aba Inicio, aberta pela tela de Tags sem trocar de aba. */
  BuscaLancamentos: FiltrosIniciaisBusca | undefined;
};

/** Aba Analises: hub e as telas de consulta de precos. */
export type DashboardStackParamList = {
  DashboardHome: undefined;
  /** `produtoId` abre a analise ja no produto (vinda da inflacao pessoal). */
  AnalisePrecos: { produtoId?: string } | undefined;
  HistoricoPrecos: undefined;
  InflacaoPessoal: undefined;
  Orcamento: undefined;
};

export type ProdutosStackParamList = {
  ProdutosList: undefined;
  ProdutoForm: { produtoId?: string } | undefined;
};

export type RootTabParamList = {
  Home: NavigatorScreenParams<HomeStackParamList> | undefined;
  GastosMensais: undefined;
  Produtos: NavigatorScreenParams<ProdutosStackParamList> | undefined;
  Dashboard: NavigatorScreenParams<DashboardStackParamList> | undefined;
  Menu: NavigatorScreenParams<MenuStackParamList> | undefined;
};
