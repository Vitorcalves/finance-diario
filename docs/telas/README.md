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
3. Monta `SafeAreaProvider` → `ThemeProvider` → `ToastProvider` → `AppRoutes`. Até tudo ficar pronto, quem aparece é
   a tela de abertura (abaixo); o indicador de carregamento fica por baixo dela.
4. Em desenvolvimento, o banco pode ser inspecionado pelo Drizzle Studio (`useDrizzleStudio`).

**Tela de abertura (splash).** É nativa, do `expo-splash-screen`, e a configuração fica no plugin dele, em `app.json`
(o bloco `splash` saiu: o Expo 58 já o ignorava). Mostra a logo (`assets/logo.png`) com 128 dp no fundo do tema:
`#f2f5f3` no claro e `#0b1210` no escuro.

- O `App.tsx` chama `SplashScreen.preventAutoHideAsync()` ao ser carregado e `SplashScreen.hide()` quando o banco, o
  tema e a fonte estão prontos, com as rotas já montadas: o splash sai direto para o app, sem passar pelo indicador.
- Se a inicialização do banco falhar, o splash também sai e fica o indicador, como antes (o erro vai para o console).
- O modo do splash (claro ou escuro) é o do aparelho: o sistema o desenha antes de o app ler a preferência gravada.
  Com "Claro" ou "Escuro" forçado no Menu, a abertura pode vir no outro modo.
- No Android 12 ou mais novo, só aparece o círculo central de 192 dp do ícone do splash. A logo é quadrada e cabe nele
  até uns 160 dp de largura; acima disso os cantos são cortados.
- Imagem, tamanho e cores viram arquivos nativos: depois de mudar o plugin, rodar
  `npx expo prebuild --platform android` e gerar um novo build (`npm run android`). Num build anterior ao
  `expo-splash-screen` as chamadas do `App.tsx` não fazem nada e a abertura fica como era.

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
| 020 | `deleted_at` em `produtos`, `produto_variantes`, `marcas`, `categorias` e `empresas` (exclusão lógica) |
| 021 | `transacoes.chave_nfce` (com índice) e `nfce_itens_variantes` (de-para dos itens da nota fiscal por empresa) |

Migration publicada não muda: correções entram numa migration nova. O "Recriar banco" desfaz todas (cada `down`) e
aplica de novo.

### Exclusão lógica dos cadastros (`src/models/exclusaoLogica.ts`)

Produtos, variantes, marcas, categorias de produto e empresas **não saem do banco** quando o usuário exclui: a linha
fica, com a data em `deleted_at` (`NULL` = ativo). Antes, o `DELETE` levava junto o que dependia do cadastro: produto e
variante apagavam em cascata o histórico de preços e desligavam os itens dos lançamentos; a empresa tirava o mercado
do histórico e dos lançamentos; a marca saía das variantes. Com a linha no lugar, nenhuma chave estrangeira dispara e
o que já foi registrado continua inteiro e com nome.

| Ao excluir   | O que o model faz (`delete...ById`)                                                              |
|--------------|--------------------------------------------------------------------------------------------------|
| Produto      | Marca o produto e as variantes ativas dele; tira os itens dele da Lista de compras               |
| Variante     | Marca a variante; os itens e as cotações da Lista de compras ficam sem ela                       |
| Marca        | Marca a marca; as variantes que a usam continuam com ela                                         |
| Categoria    | Marca a categoria; os vínculos com os produtos ficam no banco, sem aparecer                      |
| Empresa      | Marca a empresa; ela sai da comparação da Lista de compras, com as cotações anotadas nela        |

A Lista de compras é ajustada porque é rascunho, não histórico: os models repetem ali o que a chave estrangeira fazia.

**Regra das telas:**

- **Seletor e cadastro listam só os ativos.** É o padrão de `listProdutos`, `listProdutoVariantes`, `listMarcas`,
  `listCategorias` e `listEmpresas`. Um excluído nunca é oferecido para uso novo.
- **Quem dá nome ao que já aconteceu pede `{ comExcluidos: true }`:** Home, Busca, Mês e Planos (empresa do
  lançamento), Histórico de preços, Análise de preços, Inflação pessoal e o `HistoricoProdutoModal`. As marcas são
  lidas com as excluídas em toda tela que monta rótulo de variante.
- **Onde ativo e excluído aparecem lado a lado** (filtro de empresa da Busca, produto da Análise e do Histórico de
  preços, marca da variante em edição), o excluído vem depois e marcado "(excluído)" / "(excluída)"
  (`nomeComExclusao`, `ativosPrimeiro`). No histórico em si o nome vai puro.
- **Referência para compra nova** (Lista de compras e Orçamento) usa `listHistoricoPrecoDeAtivos`: só o histórico de
  produto e variante ativos, e o preço visto numa empresa excluída fica sem mercado. `listHistoricoPreco` continua
  trazendo tudo, para as análises.

No código: `getXById` devolve o registro mesmo excluído (confira `deleted_at`); insert e update recebem o tipo sem o
campo (`SemExclusao<T>`); `somenteAtivos` e `estaAtivo` filtram uma lista já carregada. Não há tela para desfazer uma
exclusão. O backup em JSON leva a coluna; um backup de antes da migration 020 entra com todos ativos.

### Nome único nos cadastros (`src/models/nomeRepetido.ts`)

Marcas, empresas e categorias de produto **não aceitam nome repetido**, como as tags já não aceitavam: duas marcas
"Camil" viram rótulos iguais no seletor e dividem as variantes entre si.

- **Comparação** (`chaveDoNome`): sem diferenciar maiúsculas, acentos nem espaços sobrando. "TIO JOAO" e
  " tio  joão " são o mesmo nome que "Tio João".
- **Só os ativos contam.** O cadastro excluído continua no banco (seção acima), mas não segura o nome: dá para criar
  outro igual a um excluído.
- **Onde vale:** no model, então em qualquer tela. `insertMarca`, `updateMarca`, `insertCategoria`, `insertEmpresa` e
  `updateEmpresa` chamam `exigirNomeLivre` antes de gravar e recusam com `NomeRepetidoError`, cuja mensagem cita o
  cadastro que já existe ("Já existe a marca "Camil"."). As telas mostram essa mensagem num alerta "Nome repetido" e
  o painel continua aberto.
- **Edição:** o registro não é repetido de si mesmo, e salvar sem trocar o nome sempre passa. Quem já tinha dois
  cadastros iguais antes desta regra ainda edita o resto de cada um (CNPJ, categorias); só não cria um terceiro nem
  renomeia para um nome em uso.

Não há índice único no banco nem migration: os repetidos que já existiam continuam lá, e o backup importado entra como
está. Para desfazer uma repetição antiga, renomeie ou exclua um dos dois.

### Nota fiscal pelo QR Code (migration 021)

O cupom fiscal (NFC-e de MG) lido pelo atalho Cupom da Home vira lançamento; o fluxo está na
[Home](Home.md), seção "Cupom fiscal (NFC-e)".

- **`transacoes.chave_nfce`:** a chave de acesso da nota (44 caracteres) na transação dos itens; na compra
  parcelada, no registro da compra (parcela 0). Serve para avisar "Esta nota já foi lançada" ao ler o mesmo cupom.
  `insertTransacao` grava a coluna, então o "Desfazer" da exclusão a devolve.
- **`nfce_itens_variantes`:** `empresa_id`, `chave_item`, `produto_id`, `variante_id`, `created_at` e `updated_at`,
  com chave primária (`empresa_id`, `chave_item`). A `chave_item` é `codigo:<código do item na nota>` ou, sem código,
  `descricao:<descrição normalizada>`. Vale por empresa porque o código é o do cadastro da loja. Grava ao lançar,
  para cada item que veio da nota e saiu ligado a um produto; aprender de novo atualiza a linha. De-para que aponta
  para produto ou variante excluído continua no banco e é ignorado na leitura.
- **Backup:** a coluna e a tabela entram no JSON sozinhas (o export lê o `sqlite_master`); um backup de antes da 021
  entra com a chave vazia e sem de-para.
- **CNPJ das empresas:** o cadastro aceita o CNPJ com ou sem pontuação; a nota compara sem pontuação e em maiúsculas
  (o CNPJ novo, de julho de 2026, tem letras). A empresa cadastrada pelo cupom grava o CNPJ formatado
  (`20.320.503/0011-23`).

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
| `ConsultaNfce`           | Modal de tela cheia com a consulta da NFC-e da SEFAZ-MG numa WebView (`react-native-webview`, carregado sob demanda): o usuário passa pela verificação, o app lê o HTML e entrega a nota; "Lançar sem os itens" sempre à mão | Home (atalho Cupom) |
| `ContaIcone`             | Selo do tipo da conta na cor dela                                              | Contas |
| `HistoricoProdutoModal`  | Histórico de preços e de compras de um produto, com filtro por variante        | Produtos, Orçamento |
| `NomeSimplesForm`        | Formulário de uma linha para criar categoria, marca ou tag dentro de um seletor | Produto, variante, lançamento |
| `ScannerCodigoBarras`    | Câmera (`expo-camera`) que lê o código de barras; `modo="qr"` lê o QR Code do cupom (título, dica e moldura quadrada próprios) | item do lançamento, variante, lista, histórico, orçamento; QR Code na Home |
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
| `chaveNfce.ts`           | QR Code e chave de acesso da NFC-e (dígito verificador, versões 2 e 3, contingência), URL da consulta de MG e o filtro de navegação da WebView |
| `paginaNfceMg.ts`        | Leitor da página da NFC-e da SEFAZ-MG (nota, verificação, não encontrada, outra nota), sem biblioteca de DOM |
| `rascunhoDaNotaFiscal.ts` | Da nota para o rascunho do formulário: empresa pelo CNPJ, cadastro sugerido, rateio do desconto, de-para dos itens |
| `haptics.ts`, `local.ts` | Vibrações e catálogo de locais                                                  |

## Testes

`npm test` roda `node --test` com `tsx`. Cada teste fica ao lado do módulo (`<modulo>.test.ts`). Os testes de banco
usam o SQL de verdade: `tsconfig.test.json` troca `expo-sqlite` por um adaptador sobre o `node:sqlite` em memória
(`tests/setup/expo-sqlite.ts`) e `expo-file-system/legacy` por um sistema de arquivos em memória. Páginas reais da
consulta da NFC-e ficam em `tests/fixtures/nfce/`. Detalhes em `tests/README.md`.

## Mantendo os documentos

Ao mudar uma tela, atualizar o documento dela (e o Relatório, quando mudar a visão geral). Mudanças em model ou util
compartilhado podem afetar várias telas: a coluna "Usado em" acima e as seções "Models e tabelas" ajudam a achar quais.
