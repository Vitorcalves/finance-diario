# Telas — documentação detalhada

Um documento por tela, com funcionalidades, componentes, models e a lógica por trás. A visão geral (contagem de telas,
mapa e resumo de cada uma) continua no [Relatório de telas](<../Relatório de telas — Finance Diário.md>); as
pendências ficam em [Tarefas](<../Tarefas — Finance Diário.md>). Este arquivo junta o que vale para todas as telas.

## Índice

Cada arquivo tem o nome da pasta da tela em `src/views/`.

| Aba      | Tela                                              | Rota                   |
|----------|---------------------------------------------------|------------------------|
| Início   | [Home (Finance Diário)](Home.md)                  | `HomeMain`             |
| Início   | [Busca de lançamentos](BuscaLancamentos.md)       | `BuscaLancamentos`     |
| Início   | [Lista de compras](ListaCompras.md)               | `ListaCompras`         |
| Início   | [Notas para lançar](NotasLancamento.md)           | `NotasLancamento`      |
| Mês      | [Gastos do mês](Mensal.md)                        | `GastosMensais`        |
| Produtos | [Produtos](ProdutosList.md)                       | `ProdutosList`         |
| Produtos | [Novo / Editar Produto](ProdutoForm.md)           | `ProdutoForm`          |
| Análises | [Análises (hub)](Dashboard.md)                    | `DashboardHome`        |
| Análises | [Análise de preços](AnalisePrecos.md)             | `AnalisePrecos`        |
| Análises | [Histórico de Preços](HistoricoPrecos.md)         | `HistoricoPrecos`      |
| Análises | [Inflação pessoal](InflacaoPessoal.md)            | `InflacaoPessoal`      |
| Análises | [Orçamento](Orcamento.md)                         | `Orcamento`            |
| Menu     | [Menu](MenuHome.md)                               | `MenuHome`             |
| Menu     | [Categorias de lançamento](CategoriasLancamento.md) | `CategoriasLancamento` |
| Menu     | [Categorias de produto](Categorias.md)            | `Categorias`           |
| Menu     | [Marcas](Marcas.md)                               | `Marcas`               |
| Menu     | [Empresas](Empresas.md)                           | `Empresas`             |
| Menu     | [Assinaturas e parcelas](Planos.md)               | `Planos`               |
| Menu     | [Contas](Contas.md)                               | `Contas`               |
| Menu     | [Faturas](Faturas.md)                             | `Faturas`              |
| Menu     | [Tags](Tags.md)                                   | `Tags`                 |
| Menu     | [Integração](Integracao.md)                       | `Integracao`           |
| —        | [Mais funcionalidades (sem rota)](More.md)        | —                      |

### Como cada documento está organizado

1. **Cabeçalho:** aba, rota, pasta e título exibido.
2. **Para que serve.**
3. **Navegação:** de onde se chega, parâmetros da rota e para onde a tela leva.
4. **Funcionalidades:** o que o usuário vê e pode fazer, bloco a bloco.
5. **Arquivos:** os arquivos da pasta e a árvore de componentes.
6. **Lógica:** o hook da tela (carga, derivados, ações) e as regras de cálculo.
7. **Models e tabelas:** as funções de `src/models` chamadas e as tabelas que elas leem ou gravam.
8. **Validações e mensagens**, **Testes** e **Observações** (inconsistências e pontos de atenção achados no código).

## Arquitetura comum

### Abertura do app (`App.tsx`)

1. `initializeDatabase({ antesDeMigrar: backupAntesDasMigrations })`: liga o WAL, cria a tabela `migrations` e aplica
   as pendentes, cada uma numa transação. Se havia dados e alguma migration pendente, grava antes uma cópia do banco
   em JSON (sem a cópia, nenhuma migration roda e o app não abre). No fim, liga as chaves estrangeiras.
2. Lê a preferência de tema (`getTemaPreferido`) e carrega a fonte Inter (sem ela, o app usa a fonte do sistema).
3. Monta `SafeAreaProvider` → `ThemeProvider` → `ToastProvider` → `AppRoutes`. Até tudo ficar pronto, mostra um
   indicador.
4. Em desenvolvimento, o banco pode ser inspecionado pelo Drizzle Studio (`useDrizzleStudio`).

### Navegação (`src/routes/AppRoutes.tsx`)

- Barra inferior com 5 abas: **Início** (`Home`, pilha `HomeStack`), **Mês** (`GastosMensais`, tela única),
  **Produtos** (`ProdutosStack`), **Análises** (`Dashboard`, pilha `DashboardStack`) e **Menu** (`MenuStack`). O app
  abre em Início.
- Todas as pilhas são `native-stack` sem header nativo: cada tela desenha o próprio `ScreenHeader`.
- Atalhos entre abas usam `initial: false` (o hub da aba fica embaixo da tela aberta). Trocar de aba mantém a tela
  aberta em cada pilha; tocar de novo na aba já selecionada volta ao hub. Nenhuma aba usa `popToTopOnBlur`: o usuário
  deixa uma análise aberta e compara com outra aba.
- `BuscaLancamentos` está registrada em duas pilhas (Início e Menu), para a tela de Tags abri-la sem trocar de aba.
- Os tipos de parâmetro ficam em `src/routes/types.ts` (`FiltrosIniciaisBusca`, `Faturas: { contaId }`,
  `ProdutoForm: { produtoId }`, `AnalisePrecos: { produtoId }`).
- O ícone de cada aba (`TabIcon.tsx`) fica cheio na aba ativa e vazado nas outras.

### Padrão de cada tela

- `src/views/<Tela>/index.tsx` monta os blocos visuais; `use<Tela>.ts` concentra o acesso ao banco, o estado e os
  cálculos; `components/` guarda as partes da tela. Funções puras ficam em arquivos próprios (`series.ts`,
  `charts.ts`, `comparativo.ts`, `grafico.ts`, `normalizacao.ts`) ou em `src/utils/`, e têm testes.
- A carga roda em `useFocusEffect`: voltar para a tela relê os dados, então o que foi gravado em outra tela (ou um
  backup importado) aparece sem reiniciar o app. O indicador de carregamento aparece só na primeira carga.
- Formulários abrem em `BottomSheet` e recebem uma `key` nova a cada abertura, para nascerem com os dados certos.
- Exclusões em lista usam o aviso (`Toast`) com "Desfazer" quando dá para restaurar; as outras confirmam antes com
  `Alert`.
- A gravação passa sempre pelos models. Operações com várias linhas usam `emTransacao` (tudo ou nada); chamadas
  aninhadas reaproveitam a transação de fora.

## Banco de dados

SQLite local (`expo-sqlite`, arquivo `finance_diario.db`), com as chaves estrangeiras ligadas. A conexão é única e
validada uma vez na abertura (`getConnection`).

### Migrations (`src/models/migrations/`)

| Id  | O que fez                                                                                         |
|-----|---------------------------------------------------------------------------------------------------|
| 001 | Tabelas iniciais: settings, unidades, tags, categorias, empresas, marcas, produtos, categoria_produto, produto_variantes, historico_preco, transacoes, transacoes_tags, recorrentes, itens_transacao |
| 002 | `itens_transacao.variante_id`                                                                     |
| 003 | `planos_pagamento`; `transacoes.plano_id` e `parcela_numero`; índice único de idempotência; remove `recorrentes` |
| 004 | Unidade avulsa ("Unidade", id 7)                                                                   |
| 005 | `local` em `historico_preco` e `transacoes` (Muriaé/Viçosa)                                       |
| 006 | Unidades a granel (ids 8, 9 e 10)                                                                  |
| 007 | `produtos.eventual` (compra eventual)                                                              |
| 008 | `categorias_lancamento` com as categorias padrão; `categoria_id` em transações e planos            |
| 009 | `lista_compras_itens`                                                                              |
| 010 | `lista_compras_mercados` e `lista_compras_precos` (preço por mercado)                              |
| 011 | Variante vista em cada preço da lista                                                              |
| 012 | `contas` (caixa, reserva, cartão) e `faturas`; caixa padrão; `conta_id`, `conta_destino_id`, `fatura_id` |
| 013 | Conta do plano (`planos_pagamento.conta_id`)                                                       |
| 014 | Entrada programada (`planos_pagamento.conta_destino_id`)                                           |
| 015 | `transacoes.natureza`; garante o caixa padrão                                                      |
| 016 | Várias cotações por item e mercado (`lista_compras_precos` ganha `id`)                             |
| 017 | `notas_lancamento`                                                                                 |
| 018 | Índice único (`transacao_id`, `tag_id`) e índice por tag em `transacoes_tags`                      |
| 019 | `empresas_categorias_lancamento` (categorias de lançamento de cada empresa)                        |

Migration publicada não muda: correções entram numa migration nova. O "Recriar banco" desfaz todas (cada `down`) e
aplica de novo.

### Natureza das transações (`src/models/naturezaTransacao.ts`)

Cada linha de `transacoes` grava o que ela é; as consultas filtram por aqui.

| Natureza            | O que é                                                              | Caixa | Fluxo de gastos | Visível |
|---------------------|----------------------------------------------------------------------|:-----:|:---------------:|:-------:|
| `movimento`         | Gasto ou entrada direto numa conta (à vista, parcela/assinatura no caixa, salário) | sim | sim | sim |
| `compra_cartao`     | Compra no cartão (à vista ou parcela), presa à fatura do ciclo       | não   | sim             | sim     |
| `registro_compra`   | Parcela 0 da compra parcelada: valor cheio e itens, sem saldo         | não   | não             | não     |
| `transferencia`     | Dinheiro de uma conta para outra (aporte, resgate)                   | sim   | não             | sim     |
| `pagamento_fatura`  | Sai do caixa pagante e quita o cartão                                | sim   | não             | sim     |

- **Caixa** (`NATUREZAS_DE_CAIXA`): o que mexe direto no dinheiro de uma conta.
- **Fluxo de gastos** (`NATUREZAS_DO_FLUXO`): gasto e receita (Home, Mês, projeção, tags); a compra no cartão conta no
  mês da compra, e o pagamento da fatura fica de fora para não contar em dobro.
- **Visível** (`NATUREZAS_VISIVEIS`): o que aparece no feed e na busca.
- Valores sempre com sinal: negativo é saída. A coluna `contabilizado_saldo` é legado (gravada a partir da natureza,
  nenhuma consulta lê).

### Catálogos fixos (sem tabela própria)

- **Unidades** (`src/utils/unidades.ts`, espelhadas na tabela `unidades`): Metros, Centímetros, Quilogramas, Gramas,
  Litros, Mililitros, Unidade e as três a granel. Cada uma tem sigla, grupo e fator para a unidade primária do grupo,
  base do preço por kg/L/m/un.
- **Locais** (`src/utils/local.ts`): Muriaé (padrão) e Viçosa. O local padrão é escolhido no Menu.

### Chaves em `settings`

`tema`, `local_padrao`, `lista_compras_mercado` (mercado atual da Lista de compras), `api_url`, `api_token` e
`monthly_income` (sem uso em tela).

## Componentes compartilhados

### `src/components/`

| Componente               | Para que serve                                                                 | Usado em |
|--------------------------|--------------------------------------------------------------------------------|----------|
| `BrazilianDateInput`     | Campo DD/MM/AAAA que devolve `YYYY-MM-DD` (ou vazio, se inválida)              | lançamento, busca, orçamento, planos, contas, faturas |
| `BrazilianIntegerInput`  | Campo numérico digitado da direita para a esquerda, com casas decimais fixas   | valores, quantidades e preços |
| `CategoriaIcone`         | Círculo com o ícone da categoria sobre a cor dela                              | listas, seletores, gráficos |
| `ContaIcone`             | Selo do tipo da conta na cor dela                                              | Contas |
| `HistoricoProdutoModal`  | Histórico de preços e de compras de um produto, com filtro por variante        | Produtos, Orçamento |
| `NomeSimplesForm`        | Formulário de uma linha para criar categoria, marca ou tag dentro de um seletor | Produto, variante, lançamento |
| `ScannerCodigoBarras`    | Câmera (`expo-camera`) que lê o código de barras                               | item do lançamento, variante, lista, histórico, orçamento |
| `SeletorCategoria`       | Faixa de categorias de um tipo, com ícone e cor                                | lançamento, assinatura |
| `SeletorCor`             | Grade com a paleta do app                                                      | categorias de lançamento, contas |
| `SeletorMultiplo`        | Lista com busca, de escolha única ou múltipla, com "adicionar" opcional; opção `oculta` só aparece quando buscada (`textoOcultas` avisa que a lista está filtrada) | produto, empresa, tags, categorias, marcas |
| `BlankView`              | Tela vazia na cor de fundo                                                     | nenhuma tela (sem uso; pendência em Tarefas) |

### `src/components/ui/`

`Aparecer` (entrada suave), `BarraProgresso` (barra com fatias), `BottomSheet` (painel inferior com arrasto, teclado
e voltar do Android), `Button`, `ChipSelector` (chips de escolha única, com contador opcional), `EmptyState`, `Fab`
(botão flutuante), `IconButton`, `KeyboardAvoidingScreen`, `LoadingState`, `MenuAcoes` (painel de ações do "..."),
`OpcoesSheet` (lista de escolha única em painel), `PressableScale` (toque com escala e vibração opcional),
`ScreenHeader` (título, voltar opcional e ação à direita), `ScrollComTeclado` (rolagem que mantém o campo focado
visível), `SegmentedControl`, `SwipeableRow` (linha com ações ao deslizar), `Text` e `TextInput` (fonte e cores do
tema) e `Toast` (`useToast().mostrar(mensagem, { tipo, acao })`, um aviso por vez).

### Tema (`src/theme/`)

`ThemeProvider` monta os dois temas (claro e escuro) uma vez e escolhe pela preferência (Sistema, Claro, Escuro).
`useTheme()` devolve `colors`, `sharedStyles`, `typography`, `corCategoria(chave)` e a preferência. `makeStyles`
cria estilos dependentes das cores. A paleta de categorias (azul, laranja, aqua, amarelo, magenta, verde, violeta,
vermelho, cinza) é validada para daltonismo nos dois modos.

## Utilitários (`src/utils/`)

| Módulo                   | Conteúdo principal                                                              |
|--------------------------|---------------------------------------------------------------------------------|
| `format.ts`              | `toCurrency`, `toCurrencyFino`, `toCurrencyPorUnidade`, `toPercent`, `formatarData`, `formatarDiaRelativo` |
| `busca.ts`               | `normalizarTexto`, `correspondeBusca`, `filtrarPorTexto`, `totalizarBusca`      |
| `periodos.ts`            | Períodos da busca e rótulos de intervalo                                        |
| `parcelas.ts`            | Rateio sem perder centavo, datas das ocorrências, próxima ocorrência, custo mensal |
| `cartao.ts`              | Ciclo da fatura de uma compra e próximos ciclos                                 |
| `projecaoMes.ts`         | Gasto realizado, comprometido, médias e projeção do mês                         |
| `inflacaoPessoal.ts`     | Inflação da cesta: preço do mês, peso pelas compras, variação, acumulado e impacto por item |
| `contas.ts`              | Valor, descrição, meta, cor e seções das contas                                 |
| `agruparPorDia.ts`, `itensPorTransacao.ts` | Agrupamento das listas de lançamentos                         |
| `unidades.ts`, `variantes.ts` | Unidades, granel, rótulos de variante e preço por unidade primária         |
| `comparativoMercados.ts`, `comparativoLista.ts`, `cotacoesLista.ts`, `comparativoVariantes.ts` | Comparações de preço do Orçamento e da Lista de compras |
| `sugestoesCompra.ts`, `precosParaHistorico.ts` | Sugestões "Costuma comprar" e preços da pesquisa para o histórico |
| `interpretarNota.ts`     | Interpretador local das Notas para lançar                                       |
| `haptics.ts`, `local.ts` | Vibrações e catálogo de locais                                                  |

## Testes

`npm test` roda `node --test` com `tsx`. Cada teste fica ao lado do módulo (`<modulo>.test.ts`). Os testes de banco
usam o SQL de verdade: `tsconfig.test.json` troca `expo-sqlite` por um adaptador sobre o `node:sqlite` em memória
(`tests/setup/expo-sqlite.ts`) e `expo-file-system/legacy` por um sistema de arquivos em memória. Detalhes em
`tests/README.md`.

## Mantendo os documentos

Ao mudar uma tela, atualizar o documento dela (e o Relatório, quando mudar a visão geral). Mudanças em model ou util
compartilhado podem afetar várias telas: a coluna "Usado em" acima e as seções "Models e tabelas" ajudam a achar quais.
