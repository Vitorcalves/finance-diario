# Relatório de telas — Finance Diário

Nov 6, 2026 · @carlos

## Visão geral

O Finance Diário tem **21 telas** ativas, distribuídas em 5 abas inferiores. É um app React Native 0.81 com Expo 54,
banco local SQLite (expo-sqlite) e navegação React Navigation 7 (bottom tabs + native stacks, todos sem header nativo).

- **Início** (pilha Home): lançamentos do dia, busca de lançamentos e lista de compras.
- **Mês**: tela única, sem pilha, com os gastos do mês.
- **Produtos** (pilha Produtos): lista e formulário de produtos.
- **Análises** (pilha Dashboard): hub de análises, análise de preços, histórico de preços e orçamento.
- **Menu** (pilha Menu): cadastros, financeiro (planos, contas, faturas) e integração.

A app inicia na aba Início. Antes de mostrar as rotas, `App.tsx` inicializa o banco, carrega o tema preferido
(claro/escuro/sistema) e a fonte Inter. Cada tela segue o padrão `src/views/<Tela>/index.tsx` + um hook `use<Tela>.ts` +
uma pasta `components/`.

## Mapa de telas

Todas as rotas estão em `src/routes/AppRoutes.tsx`; a pasta de cada tela fica em `src/views/`.

| Aba      | Rota                 | Pasta                | Título na tela           | Propósito                                                       |
|----------|----------------------|----------------------|--------------------------|-----------------------------------------------------------------|
| Início   | HomeMain             | Home                 | Finance Diário           | Saldo, atalhos, novo lançamento e lançamentos do dia            |
| Início   | BuscaLancamentos     | BuscaLancamentos     | Lançamentos              | Todos os lançamentos com busca e filtros                        |
| Início   | ListaCompras         | ListaCompras         | Lista de compras         | Lista com pesquisa de preços por mercado e fechamento da compra |
| Mês      | GastosMensais        | Mensal               | Gastos do mês            | Evolução do gasto no mês, gráficos por dia, categoria e local   |
| Produtos | ProdutosList         | ProdutosList         | Produtos                 | Lista de produtos cadastrados                                   |
| Produtos | ProdutoForm          | ProdutoForm          | Novo / Editar Produto    | Cadastro de produto, categorias e variantes                     |
| Análises | DashboardHome        | Dashboard            | Análises                 | Hub com três cartões de análise                                 |
| Análises | AnalisePrecos        | AnalisePrecos        | Análise de preços        | Valor pago x histórico de preços ao longo do tempo              |
| Análises | HistoricoPrecos      | HistoricoPrecos      | Histórico de Preços      | Preços registrados agrupados por variante ou produto            |
| Análises | Orcamento            | Orcamento            | Orçamento                | Pesquisa de preços por mercado, sem gerar lançamento            |
| Menu     | MenuHome             | MenuHome             | Menu                     | Cadastros, financeiro, preferências, sistema e zona de perigo   |
| Menu     | CategoriasLancamento | CategoriasLancamento | Categorias               | Categorias dos lançamentos (Mercado, Transporte...)             |
| Menu     | Categorias           | Categorias           | Categorias               | Categorias de produto                                           |
| Menu     | Marcas               | Marcas               | Marcas                   | Marcas usadas nas variantes                                     |
| Menu     | Empresas             | Empresas             | Empresas                 | Mercados e lojas                                                |
| Menu     | Planos               | Planos               | Assinaturas e parcelas   | Assinaturas e acompanhamento de parcelamentos                   |
| Menu     | Contas               | Contas               | Contas                   | Caixas, reservas de investimento e cartões                      |
| Menu     | Faturas              | Faturas              | Faturas — nome do cartão | Faturas de um cartão e pagamento                                |
| Menu     | Integracao           | Integracao           | Integração               | Exportar/importar JSON, API e perguntas à IA                    |
| —        | (sem rota)           | More                 | Mais funcionalidades     | Placeholder "Em construção", não está em nenhuma rota           |

As telas também se cruzam entre abas: a Home abre Orçamento, Histórico de preços e Assinaturas pelos atalhos; Produtos
abre o histórico de preços; Contas abre Faturas com o `contaId` do cartão.

## Detalhe por tela

### Aba Início

**Home (Finance Diário)** — tela inicial, com a data por extenso no subtítulo.

- Resumo de totais no topo (`ResumoTotais`).
- Atalhos rápidos: Lista, Orçamento, Assinaturas, Preços (abrem telas de outras abas).
- Lançamentos agrupados por dia; deslizar o item define a categoria ou exclui (com desfazer).
- Botão flutuante (+) abre `NovoLancamentoForm`, com itens de produto e compra parcelada.
- Busca no header e "Ver todos" levam à Busca; puxar para baixo atualiza.

**Busca de lançamentos** — todos os lançamentos com filtros.

- Busca por texto, período (inclusive personalizado), tipo, categoria, empresa e conta.
- Resumo com quantidade, total de saídas e de entradas.
- Pode abrir com filtros já aplicados (ex.: vinda do gráfico de categorias); reutiliza `ListaLancamentos` da Home.

**Lista de compras** — a tela mais completa (442 linhas no `index.tsx`).

- Adicionar rápido por produto, sugestões e leitura de código de barras pela câmera.
- Mercados: escolhe o mercado atual e anota o preço de cada item, inclusive várias marcas/embalagens.
- Comparação entre mercados; seções "A comprar" e "No carrinho".
- Finalizar gera um lançamento pré-preenchido com o carrinho e grava os preços no histórico.
- Menu "...": adicionar com detalhes, ler código, salvar preços no histórico, apagar preços, tirar o carrinho, esvaziar
  lista.

### Aba Mês

**Gastos do mês** — ritmo do gasto do dia 1 ao fim do mês.

- Seletor de mês; arrastar para o lado troca de mês; botão para voltar ao mês atual.
- Resumo com comparativo ao mês anterior e projeção.
- Gráficos: acumulado (com projeção), diário (tocar no dia mostra o detalhe), por categoria e por local.

### Aba Produtos

**Produtos** — lista com filtro Frequentes / Eventuais / Todos e contadores.

- Cartão com categorias e variantes de cada produto.
- Menu do produto: ver histórico de preços, editar, excluir.

**Novo / Editar Produto** — nome, unidade, categorias e variantes (marca, embalagem, código de barras).

- Cria categoria e marca na hora, sem sair do formulário.
- Marca "compra eventual" para tirar o produto da lista padrão.

### Aba Análises

**Análises (hub)** — três cartões: Análise de preços, Histórico de preços, Orçamento.

**Análise de preços** — gráfico de linhas do valor pago contra o histórico de preços do produto.

- Filtros de produto e variante; opção de ver o preço por unidade base (R$/kg) quando as unidades batem.
- Cartão de resumo dos preços. É a tela com alterações não commitadas hoje.

**Histórico de Preços** — preços registrados agrupados por variante ou produto.

- Destaca o grupo com menor preço atual; filtro por código de barras lido.

**Orçamento** — pesquisa de preços na gôndola, sem gerar lançamento.

- Itens com quantidade (inclusive a granel), dados da pesquisa, comparativo de mercados e de variantes.
- Elege o mercado mais barato entre os que têm todos os itens; botão para limpar com confirmação.

### Aba Menu

**Menu** — quatro grupos e um cartão de preferências.

- Cadastros: categorias de lançamento, categorias de produto, marcas, empresas.
- Financeiro: assinaturas e parcelas, contas e cartões.
- Preferências: tema e local padrão.
- Sistema: Integração. Zona de perigo: recriar o banco (apaga tudo, com confirmação).

**Categorias de lançamento** — categorias como Mercado e Transporte, em grupos; toque para editar.

**Categorias de produto**, **Marcas** e **Empresas** — cadastros simples: lista de cartões, botão + no header e modal de
formulário.

**Assinaturas e parcelas** — resumo e lista de planos.

- Assinaturas são cadastradas aqui e já geram as cobranças do mês.
- Parcelamentos nascem no lançamento da compra e aqui só aparecem para acompanhar.
- Encerrar apaga só as cobranças futuras; excluir apaga todas.

**Contas** — resumo (saldo, reservas, aberto nos cartões) e uma seção por tipo: caixas, reservas, cartões, inativas.

- Aportar/resgatar em reservas (transferência entre contas) e extrato da reserva.
- Conta com lançamentos é inativada em vez de excluída; o caixa padrão nunca sai.

**Faturas** — ciclos do cartão com status, vencimento e total; pagar escolhe a conta pagante.

**Integração** — quatro modos num seletor: Exportar (JSON para arquivo), Importar (validar e sobrescrever o banco), API
(`POST /sync`) e IA (`POST /ia/consultar`, com modo de raciocínio).

## Observações

As pendências encontradas neste relatório estão em [Tarefas](<Tarefas — Finance Diário.md>).
