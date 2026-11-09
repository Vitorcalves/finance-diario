# Home (Finance Diário)

Aba **Início** · rota `HomeMain` (primeira da pilha `HomeStack`) · pasta `src/views/Home` · título "Finance Diário"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

É a tela inicial do app. Mostra o saldo do caixa, o resumo do mês (gasto, média por dia, projeção e o que ainda vai
vencer), as reservas, os atalhos das telas usadas no mercado e o feed de lançamentos agrupado por dia. O botão (+) abre
o formulário de novo lançamento, o mesmo que a Lista de compras e as Notas para lançar abrem já preenchido.

## Navegação

- **Entrada:** é a rota inicial do app (`initialRouteName="Home"`). Tocar de novo na aba Início, já selecionada, volta
  para cá.
- **Saídas:**
  - Lupa do header e "Ver todos" → `BuscaLancamentos`, na mesma pilha, sem filtros.
  - Atalho **Lista** → `ListaCompras`; atalho **Notas** → `NotasLancamento`.
  - Atalho **Orçamento** → aba Análises, `Orcamento`, com `initial: false` (o hub `DashboardHome` fica embaixo e o
    voltar leva a ele).
- Os atalhos **Assinaturas** (`Menu › Planos`) e **Preços** (`Análises › HistoricoPrecos`) estão comentados em
  `index.tsx`: hoje a linha de atalhos tem só três botões.

## Funcionalidades

### Cartão de saldo (`ResumoTotais`)

- **Saldo atual:** soma do saldo das contas do tipo caixa ativas, contando só o que já aconteceu até hoje. É o mesmo
  número que a tela Contas mostra para os caixas.
- **Gasto no mês** e **Média por dia** (gasto realizado dividido pelos dias já vividos do mês).
- **Barra da projeção**, só quando a projeção é maior que zero: um segmento com o gasto realizado, outro com o
  comprometido (parcelas e assinaturas que ainda vão vencer no mês), sobre a projeção de fechamento. Texto:
  "Projeção do mês: R$ X · R$ Y a vencer".
- **Cartão Reservas**, só com reserva ativa: total das reservas e uma linha por reserva com saldo, meta ("R$ 300 de
  R$ 1.000") e barra de progresso. A fração (`progressoDaMeta`) e a cor (`corDaConta`) são as mesmas do cartão da
  reserva na tela Contas.
- O fundo em gradiente é um SVG desenhado com o tamanho medido do cartão (`onLayout`).

### Atalhos rápidos (`AtalhosRapidos`)

Linha de botões iguais (ícone + rótulo), cada um com vibração curta no toque. A lista de atalhos vem pronta da tela
(`index.tsx`); o componente só desenha.

### Lista de lançamentos (`ListaLancamentos`)

- Mostra até 50 lançamentos com data até o fim do mês corrente, do mais recente para o mais antigo: gastos, entradas,
  compras no cartão, transferências e pagamentos de fatura. O registro da compra parcelada (parcela 0) não aparece.
- Agrupa por dia (`CabecalhoDia`): "Hoje", "Ontem", "Amanhã" ou "Qui, 24 set" (com o ano quando não é o atual), e o
  total do dia com sinal (verde quando positivo). Dia futuro ganha " · a vencer".
- Cada linha (`TransacaoItem`):
  - Avatar: ícone e cor da categoria; sem categoria, ícone de repetição (parcela/assinatura), seta para baixo
    (entrada), inicial da empresa ou seta para cima.
  - Descrição, selo "A vencer" (data futura), linha "categoria · empresa · N itens", etiquetas das tags e o valor
    (verde nas entradas).
  - Com itens, tocar na linha abre a lista "2× Arroz 5kg  R$ 43,90" (com animação). A compra parcelada mostra os itens
    na 1ª parcela.
- Arrastar a linha para a esquerda (`SwipeableRow`) mostra três ações:
  - **Categoria:** painel (`OpcoesSheet`) com as categorias do tipo do lançamento (saída ou entrada) e "Sem categoria".
  - **Tags:** só em gasto e entrada (natureza `movimento` ou `compra_cartao`); abre o `TagsLancamentoSheet`.
  - **Excluir:** apaga na hora, sem perguntar, e mostra o aviso com "Desfazer".
- Em parcela ou assinatura, categoria e tags valem para o plano inteiro; o aviso diz "aplicada a todas as parcelas".
- Puxar para baixo atualiza (`RefreshControl`). Sem lançamentos: "Nenhum lançamento ainda" com a dica do +.
- O cabeçalho da lista (cartão de saldo, atalhos e o título "Lançamentos" com "Ver todos") vai como
  `ListHeaderComponent`, então rola junto com o feed.

### Novo lançamento (`NovoLancamentoForm`)

Painel inferior (`BottomSheet`) "Novo lançamento", aberto pelo botão flutuante (`Fab`).

- **Tipo:** Saída, Entrada ou Transferência (`SegmentedControl`). Trocar o tipo limpa a categoria se ela for do outro
  tipo.
- **Valor:** campo grande com centavos (`BrazilianIntegerInput`, 2 casas), em vermelho na saída e verde na entrada.
  Com itens, o campo vira "Soma de N itens" e o valor passa a ser a soma deles.
- **Conta:** chips com as contas caixa e cartão ativas; o padrão é a primeira caixa. Num cartão, a etiqueta mostra
  "Cai na fatura de DD/MM (vence DD/MM)", recalculada ao mudar a data; parcelado, "1ª parcela cai na fatura de ...".
- **Transferência:** troca a conta por "De (origem)" e "Para (destino)"; o destino não lista a origem. Some categoria,
  empresa, tags, itens e parcelamento.
- **Categoria:** `SeletorCategoria` com as categorias do tipo. Ao escolher a empresa, o formulário sugere a categoria
  usada por último nela, desde que o usuário ainda não tenha escolhido uma.
- **Descrição:** opcional quando há itens (usa a do 1º item) e na transferência ("Transferência entre contas").
- **Data:** chips Hoje / Ontem e campo DD/MM/AAAA (`BrazilianDateInput`).
- **Empresa:** `SeletorMultiplo` de escolha única, com busca.
- **Tags:** `SeletorMultiplo` de várias escolhas; "Nova tag" cria a tag na hora (`NomeSimplesForm`) e já a marca.
- **Itens:** cartões dos itens (`LancamentoItemCard`, com editar e remover) e "Adicionar item", que abre o
  `LancamentoItemForm` dentro do painel.
- **Compra parcelada:** só na saída (`ParcelamentoSelector`).
- O botão de salvar muda de texto: "Parcelar em Nx", "Transferir", "Adicionar saída" ou "Adicionar entrada".
- Ao salvar com sucesso: limpa o formulário, fecha e mostra o aviso ("Saída de R$ X registrada", "Compra parcelada em
  Nx registrada", "Transferência de R$ X registrada" ou a `mensagemSucesso` recebida).
- **Rascunho:** a prop `rascunho` (`RascunhoLancamento`) abre o formulário preenchido (tipo, descrição, valor, data,
  conta, parcelas, empresa, categoria e itens). Ela é lida só na montagem; quem usa troca a `key` do formulário para
  aplicar outro rascunho. A Home não usa; a Lista de compras e as Notas para lançar usam.

### Item do lançamento (`LancamentoItemForm`)

- **Produto:** `SeletorMultiplo` com busca; produto de compra eventual só aparece quando buscado. Ao lado, o botão de
  código de barras abre o `ScannerCodigoBarras` e escolhe a variante pelo `codigo_barras`.
- **Variante:** chips "Marca 1 kg • R$ 9,90" das variantes do produto.
- Escolher o produto preenche a descrição e o preço do produto; escolher a variante preenche "Produto - Marca 1 kg" e
  o preço da variante.
- **A granel** (unidade granel na variante): a quantidade aceita 3 casas ("Quantidade (kg)"), o preço vira "Preço por
  kg" e aparece a prévia "0,750 kg x R$ 8,90 = R$ 6,68". Trocar entre variante de pacote e de granel limpa o peso ou
  volta para 1 pacote.
- O cartão do item avisa "Sem variante selecionada" quando há produto sem variante (o preço não vai para o
  histórico).

### Parcelamento (`ParcelamentoSelector`)

- Chave "Compra parcelada" com a explicação "O valor cheio fica na compra; o caixa recebe uma parcela por mês."
- Contador − / + (de 2 a 72 parcelas) e atalhos 2x, 3x, 4x, 5x, 6x, 10x, 12x, 18x e 24x.
- Prévia "de R$ 33,34" ou "R$ 33,34 e depois R$ 33,33": o rateio (`dividirEmParcelas`) não perde centavo e dá o resto
  às primeiras parcelas.
- Vencimento da 1ª parcela: ao ligar a chave, começa na data da compra.

### Tags do lançamento (`TagsLancamentoSheet`)

- Lista de caixas de marcar com todas as tags (nome e anotação). Várias podem ser marcadas.
- "Nova tag" + Criar: cria a tag e já a deixa marcada. Nome vazio ou repetido mostra o motivo.
- Em parcela ou assinatura, avisa que as tags valem para o plano inteiro.
- Salvar troca as tags do lançamento pelas marcadas (nenhuma marcada tira todas). Avisos: "Tags removidas", "Tags
  aplicadas a todas as parcelas" ou "Tags atualizadas".

## Arquivos

| Arquivo                                 | Papel                                                                          |
|-----------------------------------------|--------------------------------------------------------------------------------|
| `index.tsx`                             | Monta a tela: header com busca, cabeçalho da lista, lista, Fab e formulário    |
| `useHome.ts`                            | Carga dos dados, resumo do mês e ações (lançar, excluir, categoria, tags)      |
| `useCatalogoLancamento.ts`              | Cadastros que o formulário de lançamento usa                                   |
| `types.ts`                              | `NovoLancamento`, `ItemLancamento`, `RascunhoLancamento`, `TipoLancamento`     |
| `components/ResumoTotais.tsx`           | Cartão de saldo, projeção e reservas                                           |
| `components/AtalhosRapidos.tsx`         | Linha de atalhos                                                               |
| `components/ListaLancamentos.tsx`       | Lista por dia com as ações de deslizar; reutilizada pela Busca                 |
| `components/CabecalhoDia.tsx`           | Título e total de cada dia                                                     |
| `components/TransacaoItem.tsx`          | Linha do lançamento, com os itens expansíveis                                  |
| `components/NovoLancamentoForm.tsx`     | Formulário de lançamento; reutilizado pela Lista de compras e pelas Notas      |
| `components/LancamentoItemForm.tsx`     | Mini formulário de um item                                                     |
| `components/LancamentoItemCard.tsx`     | Item já adicionado, com editar e remover                                       |
| `components/ParcelamentoSelector.tsx`   | Chave, contador e prévia do parcelamento                                       |
| `components/TagsLancamentoSheet.tsx`    | Painel de tags de um lançamento                                                |

Árvore da tela:

```
HomeView
├── ScreenHeader (título, data por extenso, lupa)
├── LoadingState (só na 1ª carga)  |  ListaLancamentos
│   ├── cabeçalho: ResumoTotais + AtalhosRapidos + título "Lançamentos"
│   ├── SectionList → CabecalhoDia + SwipeableRow → TransacaoItem
│   ├── OpcoesSheet (categoria)
│   └── TagsLancamentoSheet
├── Fab (+)
└── NovoLancamentoForm (BottomSheet)
    ├── SegmentedControl, BrazilianIntegerInput, ChipSelector (conta), SeletorCategoria
    ├── BrazilianDateInput, SeletorMultiplo (empresa), SeletorMultiplo (tags) + NomeSimplesForm
    ├── LancamentoItemCard*, LancamentoItemForm (SeletorMultiplo, ChipSelector, ScannerCodigoBarras)
    └── ParcelamentoSelector
```

## Lógica

### Carga (`useHome` → `carregarDados`)

1. `materializarPlanos()`: gera as cobranças dos planos ativos (assinaturas e entradas programadas) até o fim do mês
   corrente. É idempotente: rodar de novo não duplica.
2. Dez leituras em paralelo:
   - `listTransacoes(null, null, { ateData: fimMes, incluirComprasCartao: true })`: o feed. Natureza visível, data até
     o fim do mês, `LIMIT 50`. O teto de data impede que um parcelamento de 24x ocupe o feed com cobranças de anos à
     frente.
   - `listTransacoes(inicioMes, fimMes, { fluxoGastos: true })`: o mês inteiro, sem limite, só `movimento` e
     `compra_cartao`. É a base da média e da projeção.
   - `listItensTransacao()` e `listTransacoesCompra()`: itens e registros de compra parcelada (donos dos itens).
   - `listEmpresas()`, `getLocalPadrao()`, `listCategoriasLancamento()`, `listContasComSaldo(hoje)`, `listTags()` e
     `listTagsPorTransacao()`.
3. `projetarMes(transacoesMes, { hoje, situacao: 'corrente', diasDecorridos, diasNoMes })`.
4. Se a tela perdeu o foco durante a carga (`focada.current`), o resultado é descartado.
5. O resumo junta `somarPorTipo(contas)` (caixa disponível e total das reservas), as reservas ativas e a projeção.

A carga roda a cada vez que a tela ganha foco (`useFocusEffect`): um lançamento feito em outra tela, uma assinatura
nova ou um backup importado aparecem sem reiniciar o app. O indicador de carregamento aparece só na primeira carga;
puxar para baixo usa `atualizando`.

Derivados (`useMemo`): `secoes = agruparPorDia(transacoes)`, `itensPorTransacao = agruparItensPorTransacao(itens,
compras, transacoes)` e os mapas id → empresa e id → categoria.

### Ações do hook

| Ação                  | O que chama                                       | Depois            |
|-----------------------|---------------------------------------------------|-------------------|
| `adicionarLancamento` | `registrarLancamento(lancamento, localPadrao)`    | recarrega tudo    |
| `definirCategoria`    | `definirCategoriaTransacao(id, categoriaId)`      | recarrega tudo    |
| `definirTags`         | `definirTagsTransacao(id, tagIds)`                | recarrega tudo    |
| `criarTag`            | `salvarTag({ nome })`                             | só relê as tags   |
| `excluir`             | `excluirTransacao(id)`, devolve o que foi apagado | recarrega tudo    |
| `restaurar`           | `restaurarTransacao(excluida)`                    | recarrega tudo    |

### Formulário (`NovoLancamentoForm`)

- A cada abertura, `useCatalogoLancamento().carregar()` relê empresas, produtos, variantes, marcas, categorias, contas
  caixa e cartão ativas, a última categoria de cada empresa (`ultimaCategoriaPorEmpresa`) e as tags. Um produto criado
  agora já aparece.
- A conta padrão (primeira caixa) é aplicada durante a renderização, uma vez por abertura, quando o catálogo chega.
- `categoriaManual` impede que a sugestão por empresa troque a categoria escolhida pelo usuário.
- `cicloFatura` usa `faturaDaCompra(referência, diaFechamento, diaVencimento)`; a referência é a data da compra ou,
  parcelado, a da 1ª parcela. A tela nunca calcula datas de fatura por conta própria.
- `salvando` bloqueia o segundo toque, que criaria o lançamento em dobro.
- O valor vai com sinal: negativo na saída e na transferência, positivo na entrada.

### Gravação (`registrarLancamento`, em `src/models/lancamentos.ts`)

Tudo roda em `emTransacao`: se um passo falha, nada fica gravado (o aviso diz "Nada foi gravado").

- **Conta:** a escolhida ou, sem ela, `caixa-padrao`.
- **Transferência:** uma linha só, natureza `transferencia`, valor negativo, `conta_id` = origem e `conta_destino_id`
  = destino. Sem itens, empresa, categoria nem tags. Recusa valor zero, destino inexistente ou igual à origem.
- **À vista no caixa:** uma linha `movimento`.
- **À vista no cartão:** `garantirFatura` acha ou cria a fatura do ciclo (`faturaDaCompra`) e a linha vira
  `compra_cartao`, com `fatura_id`. Ela fica fora do caixa até a fatura ser paga.
- **Parcelado (2 ou mais):** `criarCompraParcelada` cria o plano `parcelamento` em `planos_pagamento`, o registro da
  compra (parcela 0, natureza `registro_compra`, valor cheio, data da compra) e todas as parcelas de uma vez
  ("Descrição (1/10)"). Cada parcela é `movimento` no caixa ou `compra_cartao` na fatura do ciclo da própria data.
- **Tags:** `definirTagsTransacao` na transação dos itens; na compra parcelada isso espalha as tags por todas as
  linhas do plano.
- **Itens:** uma linha em `itens_transacao` por item, presa à transação da compra (no parcelado, à parcela 0), com
  `valor` = preço unitário. Item com produto e variante chama `registrarPrecoVariante`: atualiza o preço atual da
  variante e grava uma linha em `historico_preco` com empresa, local e a data com hora.
- **Local:** sai de `getLocalPadrao()` (Menu › Preferências); o formulário não pergunta.

### Exclusão e "Desfazer"

`excluirTransacao` lê a linha, os itens e as tags, apaga itens e transação (as tags caem por `ON DELETE CASCADE`) e
devolve tudo. `restaurarTransacao` regrava com os mesmos ids; uma tag apagada enquanto o aviso estava na tela fica de
fora. Excluir uma parcela apaga só aquela linha: o plano continua e, como o `gerado_ate` já passou dela, ela não volta
a ser gerada.

## Models e tabelas

| Função                                       | Módulo                     | Tabelas                                                   |
|----------------------------------------------|----------------------------|-----------------------------------------------------------|
| `materializarPlanos`                         | `materializacaoPlanos.ts`  | `planos_pagamento`, `transacoes`, `faturas`, `transacoes_tags` |
| `listTransacoes`, `listTransacoesCompra`     | `transacoesModel.ts`       | `transacoes`                                              |
| `excluirTransacao`, `restaurarTransacao`     | `transacoesModel.ts`       | `transacoes`, `itens_transacao`, `transacoes_tags`        |
| `registrarLancamento`                        | `lancamentos.ts`           | `transacoes`, `itens_transacao`, `planos_pagamento`, `faturas`, `transacoes_tags`, `produto_variantes`, `historico_preco` |
| `listItensTransacao`                         | `itensTransacao.ts`        | `itens_transacao`                                         |
| `listContasComSaldo`, `somarPorTipo`, `listContasPorTipo` | `contas.ts`   | `contas`, `transacoes`                                    |
| `listCategoriasLancamento`, `definirCategoriaTransacao`, `ultimaCategoriaPorEmpresa` | `categoriasLancamento.ts` | `categorias_lancamento`, `transacoes`, `planos_pagamento` |
| `listTags`, `listTagsPorTransacao`, `salvarTag`, `definirTagsTransacao` | `tags.ts` | `tags`, `transacoes_tags`, `transacoes`                 |
| `listEmpresas`                               | `empresas.ts`              | `empresas`                                                |
| `listProdutos`, `listProdutoVariantes`, `listMarcas` | `produtos.ts`, `produtoVariantes.ts`, `marcas.ts` | `produtos`, `produto_variantes`, `marcas` |
| `getLocalPadrao`                             | `settingsModel.ts`         | `settings` (chave `local_padrao`)                         |

Utilitários: `projetarMes` (`utils/projecaoMes.ts`), `agruparPorDia`, `agruparItensPorTransacao`, `faturaDaCompra`
(`utils/cartao.ts`), `dividirEmParcelas` e `parcelasDaCompra` (`utils/parcelas.ts`), `progressoDaMeta` e `corDaConta`
(`utils/contas.ts`), `ehGranel`, `medidaGranel`, `rotuloVariante` e `rotuloQuantidade` (`utils/variantes.ts`),
`formatarDiaRelativo` e `toCurrency` (`utils/format.ts`).

## Regras de cálculo

- **Saldo atual:** caixa e reserva contam só transações com data até hoje; o registro da compra parcelada não pesa.
- **Gasto no mês:** saídas com data até hoje no fluxo de gastos (a compra no cartão conta no mês da compra; pagamento
  de fatura e transferência não contam, para não somar em dobro).
- **Comprometido:** saídas do mês com data depois de hoje (parcelas e assinaturas já geradas).
- **Projeção:** realizado + comprometido + média diária dos gastos avulsos (sem plano) × dias que faltam. Parcelas e
  assinaturas entram pelo valor exato e não inflam a média. A tela Mês usa a mesma função.
- **Itens da compra parcelada:** pertencem à parcela 0, que não aparece; são mostrados na parcela 1.

## Validações e mensagens

| Situação                                      | Mensagem                                                  |
|-----------------------------------------------|-----------------------------------------------------------|
| Transferência sem origem ou destino           | "Escolha a conta de origem e a conta de destino."         |
| Origem igual ao destino                       | "Origem e destino precisam ser contas diferentes."        |
| Sem descrição (e sem item para emprestar)     | "Informe a descrição do lançamento."                      |
| Data inválida                                 | "Informe uma data válida."                                |
| Valor zero e sem itens                        | "Informe o valor ou adicione ao menos um item."           |
| Parcelado com menos de 2 parcelas             | "Uma compra parcelada precisa de ao menos 2 parcelas."    |
| 1ª parcela com data inválida                  | "Informe uma data válida para a 1ª parcela."              |
| Falha ao gravar                               | "Não foi possível salvar o lançamento. Nada foi gravado." |
| Item sem descrição                            | "Informe a descrição do item ou selecione um produto"     |
| Item com quantidade zero                      | "Quantidade do item deve ser maior que zero"              |
| Item a granel sem peso                        | "Informe o peso comprado em kg (ex.: 0,750)" (ou L, m)    |
| Item com preço zero                           | "Preço unitário do item deve ser maior que zero"          |
| Código de barras sem variante                 | "Nenhuma variante cadastrada com o código ..."            |
| Tag vazia, com mais de 40 letras ou repetida  | Motivo do `ValidacaoTagError` ("Já existe a tag ...")     |

Os avisos de validação do formulário de lançamento abrem "Confira o lançamento", vibram (`vibrarAviso`) e não fecham
o painel. No painel de tags o título é "Confira a tag".

## Testes

- `src/models/lancamentos.test.ts`: compra parcelada no cartão (fatura por ciclo, dívida, pagamento).
- `src/models/listaCompras.test.ts`, bloco "registrarLancamento e o historico de compras": itens e preço no histórico,
  tudo ou nada.
- `src/models/materializacaoPlanos.test.ts`: parcelamento, assinatura, cancelamento e salário.
- `src/models/transacoesModel.test.ts`: excluir e restaurar, `emTransacao`, compras no cartão no feed.
- `src/models/tags.test.ts`, `src/models/transferencias.test.ts`, `src/models/naturezaTransacao.test.ts`,
  `src/models/contas.test.ts` e `src/models/categoriasLancamento.test.ts`.
- `src/utils/projecaoMes.test.ts`, `parcelas.test.ts`, `cartao.test.ts` e `format.test.ts`.

## Observações

- Os atalhos Assinaturas e Preços estão comentados no código; o Relatório de telas ainda os lista.
- `ehFuturo(data)` fica em `useHome.ts` e é usado pela linha e pelo cabeçalho do dia para marcar "a vencer".
- O feed corta em 50 linhas: para ver tudo, a Busca de lançamentos não tem limite.
