# Novo / Editar Produto

Aba **Produtos** · rota `ProdutoForm` (pilha `ProdutosStack`) · pasta `src/views/ProdutoForm` · título "Novo Produto"
ou "Editar Produto"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Cadastra ou edita um produto: nome, preço base, unidade, se é compra eventual, as categorias de produto e as variantes
(marca, unidade, quantidade da embalagem, código de barras e preço). Categoria e marca podem ser criadas na hora, sem
sair do formulário.

## Navegação

- **Entrada:** de [Produtos](ProdutosList.md): "+" (novo) ou menu › Editar (com `{ produtoId }`).
- **Parâmetro:** `ProdutoForm: { produtoId?: string }`. Com `produtoId` a tela entra em modo edição e carrega o
  produto.
- **Saída:** voltar, Cancelar ou, depois de salvar com sucesso, `goBack()` para a lista (que relê os dados).

## Funcionalidades

### Dados do produto

- **Nome do Produto \*** (placeholder "Ex: Arroz").
- **Preço Base \*** com centavos (`BrazilianIntegerInput`). É o preço que o item do lançamento usa quando só o produto
  é escolhido, sem variante.
- **Unidade:** chips "Nenhuma" e as unidades primárias (Metros, Quilogramas, Litros, Unidade), via `SeletorUnidade`
  com `apenasPrimarias`.
- **Compra eventual** (chave): "Comprado raramente (ex.: mouse). Some da lista padrão e só aparece no lançamento quando
  buscado." Também tira o produto das sugestões da Lista de compras.
- **Categorias:** `SeletorMultiplo` de várias escolhas, com busca e "Nova categoria" (cria a categoria e já a marca).

### Variantes

- Lista das variantes adicionadas (`VarianteCard`): marca (ou "Sem marca"), preço, unidade, "Qtd: 500" e "Código: ...",
  com editar e remover. Sem nenhuma: "Nenhuma variante adicionada".
- Mini formulário sempre visível abaixo (`VarianteForm`), "Nova variante" ou "Editar variante":
  - **Marca:** `SeletorMultiplo` de escolha única, com "Nova marca" (cria e já seleciona).
  - **Unidade:** chips "Nenhuma" e todas as unidades, inclusive as de embalagem (Gramas, Mililitros, Centímetros) e
    as a granel (Quilo (granel), Litro (granel), Metro (granel)).
  - Com unidade a granel aparece a explicação: o preço é por kg/L/m e, no lançamento, informa-se o peso comprado
    (ex.: 0,750 kg); a quantidade fica opcional (vazia = preço por 1 kg).
  - **Quantidade:** inteira (ex.: 500 para 500 g).
  - **Código de Barras:** campo numérico e botão que abre a câmera (`ScannerCodigoBarras`) e preenche o código lido.
  - **Preço \*** (ou "Preço por kg \*" a granel).
  - Botões "Adicionar variante" ou "Salvar variante" + "Cancelar" (só na edição).
- Editar troca o mini formulário para a variante escolhida (a `key` do componente muda); salvar ou cancelar volta ao
  formulário em branco. As variantes só vão para o banco quando o produto é salvo.

### Salvar

"Salvar produto" valida, grava tudo e volta para a lista com o aviso "Produto adicionado" ou "Produto atualizado". Um
segundo toque durante a gravação é ignorado.

## Arquivos

| Arquivo                           | Papel                                                                  |
|-----------------------------------|------------------------------------------------------------------------|
| `index.tsx`                       | Campos do produto, lista de variantes, mini formulário e botões        |
| `useProdutoForm.ts`               | Carga do produto, estado, criação de categoria/marca e gravação        |
| `types.ts`                        | `VarianteFormItem` (variante como texto) e `DadosVariante`             |
| `components/VarianteForm.tsx`     | Mini formulário de variante, com scanner                               |
| `components/VarianteCard.tsx`     | Variante adicionada, com editar e remover                              |
| `components/SeletorUnidade.tsx`   | Chips de unidade com a opção "Nenhuma"                                 |

Usa também `src/components/NomeSimplesForm.tsx` (formulário de uma linha para criar categoria e marca dentro do
`SeletorMultiplo`) e `src/components/ScannerCodigoBarras.tsx`.

```
ProdutoFormView
├── ScreenHeader (voltar)
└── KeyboardAvoidingScreen → ScrollComTeclado
    ├── nome, preço base, SeletorUnidade (primárias), chave "Compra eventual"
    ├── SeletorMultiplo "Categorias" + NomeSimplesForm
    ├── VarianteCard*
    ├── VarianteForm (SeletorMultiplo "Marca" + NomeSimplesForm, SeletorUnidade, campos, ScannerCodigoBarras)
    └── Cancelar / Salvar produto
```

## Lógica (`useProdutoForm`)

### Carga

Sempre lê `listCategorias()` (só as ativas) e `listMarcas({ comExcluidos: true })`. Em edição, lê também o produto
(`getProdutoById`), todas as variantes ativas e todos os vínculos de categoria, filtra os do produto e guarda duas
cópias: o estado editável e os **originais** (`vinculosOriginais`, `variantesOriginais`), usados para saber o que
excluir ao salvar. As variantes viram `VarianteFormItem`, com os números como texto.

As marcas vêm com as excluídas porque a variante que já usa uma continua com ela: o cartão da variante mostra o nome,
e o seletor de marca do `VarianteForm` oferece as ativas mais a que a variante em edição já tinha, esta marcada
"(excluída)". Uma marca excluída nunca é oferecida para uma variante nova.

### Criação na hora

- `criarCategoria(nome)`: recusa nome vazio, insere em `categorias`, relê a lista e já marca a categoria no produto.
- `criarMarca(nome)`: recusa nome vazio, insere em `marcas` e devolve o id (achado pelo nome entre as marcas ativas da
  lista relida, para uma excluída de mesmo nome não ser a escolhida), que o `VarianteForm` deixa selecionado.
- As duas recusam o nome que outra categoria ou marca ativa já usa (`NomeRepetidoError`, de `nomeRepetido.ts`; regra
  em [Base comum](README.md), seção "Nome único nos cadastros"): o alerta "Nome repetido" diz qual já existe, o mini
  formulário continua aberto e nada é marcado. Basta cancelar e escolher a que já existe na lista.

### Gravação (`salvar`)

Validação: nome obrigatório e preço maior que zero. Depois, tudo numa transação (`emTransacao`), para o produto nunca
ficar salvo pela metade:

1. `insertProduto` ou `updateProduto` (nome, preço, unidade, eventual).
2. Categorias: apaga os vínculos desmarcados e cria os novos (`categoria_produto`).
3. Variantes: exclui as originais que saíram da lista (`deleteProdutoVariantesById`, exclusão lógica); atualiza as que
   já existiam (`updateProdutoVariantes`) e insere as novas (`insertProdutoVariantes`). Quantidade vazia vira `NULL`;
   código vazio, `NULL`.

Falha em qualquer passo: "Não foi possível salvar o produto" e nada fica gravado.

## Models e tabelas

| Função                                                         | Módulo                 | Tabelas              |
|----------------------------------------------------------------|------------------------|----------------------|
| `getProdutoById`, `insertProduto`, `updateProduto`             | `produtos.ts`          | `produtos`           |
| `listProdutoVariantes`, `insertProdutoVariantes`, `updateProdutoVariantes`, `deleteProdutoVariantesById` | `produtoVariantes.ts` | `produto_variantes` |
| `listCategorias`, `insertCategoria`                            | `categorias.ts`        | `categorias`         |
| `listCategorias`, `insertCategoria`, `deleteCategoriaById` (vínculos) | `categoriasProduto.ts` | `categoria_produto` |
| `listMarcas`, `insertMarca`                                    | `marcas.ts`            | `marcas`             |

Unidades: catálogo fixo `Unidades` (`src/utils/unidades.ts`), espelhado na tabela `unidades` (migrations 001, 004 e
006). Ids: 1 Metros, 2 Quilogramas, 3 Litros, 4 Gramas, 5 Centímetros, 6 Mililitros, 7 Unidade, 8 Quilo (granel),
9 Litro (granel), 10 Metro (granel).

### Efeito de remover uma variante

A exclusão é **lógica** (migration 020; regra geral em [Base comum](README.md), seção "Exclusão lógica dos
cadastros"). Remover a variante do produto e salvar não apaga a linha: `deleteProdutoVariantesById` grava a data em
`produto_variantes.deleted_at`. O histórico de preços dela continua inteiro e os itens de lançamento continuam
apontando para ela, então as análises seguem mostrando a variante com o rótulo. Só a Lista de compras, que é rascunho,
é ajustada na mesma transação: os itens e as cotações que apontavam para ela ficam sem a variante (`NULL`).

A variante excluída some deste formulário, do lançamento, da Lista de compras e do Orçamento. Não há tela para trazê-la
de volta.

## Validações e mensagens

| Situação                     | Mensagem                                         |
|------------------------------|--------------------------------------------------|
| Nome vazio                   | "Nome do produto é obrigatório"                  |
| Preço zero                   | "Preço deve ser maior que zero"                  |
| Variante sem preço           | "Preço da variante deve ser maior que zero"      |
| Categoria sem nome           | "Nome da categoria é obrigatório"                |
| Marca sem nome               | "Nome da marca é obrigatório"                    |
| Categoria ou marca repetida  | "Já existe a categoria "X"." / "Já existe a marca "X"." (alerta "Nome repetido") |
| Falha ao carregar            | "Não foi possível carregar os dados do produto"  |
| Falha ao salvar              | "Não foi possível salvar o produto"              |

## Testes

- `src/models/produtos.test.ts`: ordem e marcação de eventual.
- `src/models/exclusaoLogica.test.ts`: a variante excluída sai da listagem, o produto e o histórico continuam, e o
  item e a cotação da Lista de compras ficam sem a marca.
- `src/models/nomeRepetido.test.ts`: marca e categoria com nome repetido são recusadas pelo model.
- `src/utils/unidades.test.ts` e `src/utils/variantes.test.ts`: conversões, granel e rótulos usados pelas variantes.

## Observações

- A tela não impede duas variantes com o mesmo código de barras; a leitura por código usa a primeira que achar.
- Marca e categoria criadas aqui ficam no cadastro mesmo que o produto não seja salvo.
- Remover uma variante não pede confirmação: ela sai da lista do formulário e só é excluída ao salvar o produto. Como
  a exclusão é lógica, o histórico de preços dela não se perde.
- O `NomeSimplesForm` fica em `src/components/`, e não na pasta da tela, porque o formulário de lançamento também o
  usa para criar tags.
