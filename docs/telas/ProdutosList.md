# Produtos

Aba **Produtos** · rota `ProdutosList` (primeira da pilha `ProdutosStack`) · pasta `src/views/ProdutosList` · título
"Produtos", subtítulo "N produtos"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Lista os produtos cadastrados (o catálogo que alimenta os itens dos lançamentos, a lista de compras, o orçamento e as
análises de preço), com busca, filtro entre produtos frequentes e de compra eventual, as categorias e as variantes de
cada um. Do menu de cada produto dá para ver o histórico de preços, editar ou excluir.

## Navegação

- **Entrada:** aba Produtos.
- **Saídas:**
  - "+" do header, ou "Adicionar produto" no estado vazio → [`ProdutoForm`](ProdutoForm.md) sem parâmetro (novo).
  - Menu do produto › Editar → `ProdutoForm` com `{ produtoId }`.
  - Menu do produto › Ver histórico de preços → abre o `HistoricoProdutoModal` por cima da lista (não muda de tela).

## Funcionalidades

### Busca e filtro

- Campo "Buscar produto", com botão de limpar. Cada palavra precisa aparecer no nome, sem diferenciar acento nem
  maiúscula (`correspondeBusca`).
- Chips com contadores: **Frequentes** (padrão), **Eventuais** e **Todos**.
- Com texto na busca, "Frequentes" também acha os eventuais: é assim que se reencontra o mouse comprado há 3 anos.
- Os produtos vêm em ordem alfabética do model (com acento ordenado como em português: "Água" junto do "A").
- Busca e filtro só aparecem quando há produtos.

### Cartão do produto (`ProdutoCard`)

- Ícone (cubo; relógio cinza no produto eventual), nome, preço base e unidade ("R$ 10,50 / Quilogramas").
- Chips: "Compra eventual" e as categorias do produto.
- "N variantes": tocar no cartão abre e fecha a lista das variantes (marca, código de barras e preço), com animação.
  Produto sem variantes não reage ao toque.
- Botão "..." abre o menu do produto.

### Menu do produto (`MenuAcoes`)

- **Ver histórico de preços** (`HistoricoProdutoModal`).
- **Editar.**
- **Excluir:** confirma ("Deseja excluir "X"? Ele sai do cadastro, do lançamento e da lista de compras. O histórico
  de preços e as compras já lançadas continuam nas análises."), exclui e avisa ""X" excluído". A exclusão é lógica:
  ver "O que a exclusão faz".

### Histórico do produto (`src/components/HistoricoProdutoModal.tsx`)

- Painel "Histórico de preços" / "Histórico de compras", com o nome do produto no subtítulo.
- Alternador **Preços registrados** (de `historico_preco`) / **Compras** (itens de lançamento, com a quantidade).
- Chips: "Produto" (todas as variantes) e um chip por variante ("Marca • 1 kg").
- Cada linha: a variante (quando o filtro é "Produto"), "Qtd. 2 • Mercado • DD/MM/AAAA", o preço e o preço por
  unidade ("R$ 8,90/kg"), quando a variante tem medida. Do mais recente para o mais antigo.
- Vazios: "Nenhum preço registrado." / "Nenhuma compra lançada.".
- O mesmo modal é usado pelo Orçamento, com a variante do item em foco (um chip "Variante" só).

### Estados

- Primeira carga: indicador. Sem produtos: "Nenhum produto cadastrado" com "Adicionar produto".
- Busca sem resultado: "Nenhum produto encontrado para "texto"" ou "Nenhum produto neste filtro".
- Puxar para baixo recarrega; voltar do formulário recarrega sem piscar (a lista relê a cada foco).

## Arquivos

| Arquivo                               | Papel                                                         |
|---------------------------------------|---------------------------------------------------------------|
| `index.tsx`                           | Header, busca, filtro, lista, menu e o modal de histórico     |
| `useProdutosList.ts`                  | Carga dos produtos e cadastros, nomes e exclusão              |
| `components/ProdutoCard.tsx`          | Cartão com categorias e variantes expansíveis (`memo`)        |
| `src/components/HistoricoProdutoModal.tsx` | Histórico de preços e compras de um produto (compartilhado) |

```
ProdutosListView
├── ScreenHeader (+)
├── busca (TextInput) + ChipSelector (Frequentes/Eventuais/Todos)
├── LoadingState | EmptyState | FlatList → ProdutoCard*
├── MenuAcoes
└── HistoricoProdutoModal (BottomSheet: SegmentedControl + ChipSelector)
```

## Lógica (`useProdutosList`)

- A cada foco: `listProdutos()`, `listProdutoVariantes()`, `listCategorias()` de `categoriasProduto.ts` (os vínculos
  produto–categoria), `listCategorias()` de `categorias.ts` (os nomes) e `listMarcas({ comExcluidos: true })`. Produtos,
  variantes e categorias vêm só os ativos; as marcas vêm com as excluídas, porque a variante que já usa uma continua
  com ela no rótulo.
- `categoriasDoProduto(id)`: nomes das categorias vinculadas. `variantesDoProduto(id)`: variantes do produto.
  `nomeUnidade` vem do catálogo fixo `Unidades`; `nomeMarca`, das marcas carregadas.
- `deletar(produto)`: confirmação, `deleteProdutoById` e recarga.
- O filtro e a busca são feitos na tela (`useMemo`), sem ir ao banco.
- O modal de histórico carrega por conta própria: `listHistoricoPorProduto`, `listPrecosPagosPorProduto` (ver
  `src/models/dashboard.ts`), `listEmpresas({ comExcluidos: true })` e
  `listProdutoVariantesByProduto(id, { comExcluidos: true })`. Com os excluídos, o registro antigo continua mostrando
  o mercado e a variante; os chips do filtro são só as variantes ativas, e o registro de uma variante excluída aparece
  no chip "Produto".

## Models e tabelas

| Função                                          | Módulo                  | Tabelas                            |
|-------------------------------------------------|-------------------------|------------------------------------|
| `listProdutos`, `deleteProdutoById`             | `produtos.ts`           | `produtos`                         |
| `listProdutoVariantes`, `listProdutoVariantesByProduto` | `produtoVariantes.ts` | `produto_variantes`          |
| `listCategorias` (vínculos)                     | `categoriasProduto.ts`  | `categoria_produto`                |
| `listCategorias` (nomes)                        | `categorias.ts`         | `categorias`                       |
| `listMarcas`                                    | `marcas.ts`             | `marcas`                           |
| `listHistoricoPorProduto`, `listPrecosPagosPorProduto` | `dashboard.ts`   | `historico_preco`, `itens_transacao`, `transacoes` |
| `listEmpresas`                                  | `empresas.ts`           | `empresas`                         |

### O que a exclusão faz

A exclusão é **lógica** (migration 020; regra geral em [Base comum](README.md), seção "Exclusão lógica dos
cadastros"): `deleteProdutoById` não apaga a linha, grava a data em `produtos.deleted_at` e, na mesma transação:

- marca com a mesma data as variantes ativas do produto (`produto_variantes.deleted_at`);
- tira da Lista de compras os itens do produto, com as cotações deles (a lista é rascunho, não histórico).

Nada mais é tocado. Como a linha continua no banco, nenhuma chave estrangeira dispara: **o histórico de preços fica
inteiro**, os itens dos lançamentos continuam ligados ao produto e à variante, e os vínculos de categoria ficam
guardados. O produto some desta lista, do formulário de lançamento, da Lista de compras e do Orçamento, e continua
aparecendo, com nome, na Análise de preços (marcado "(excluído)" no seletor), no Histórico de preços e na Inflação
pessoal.

Não há tela para desfazer a exclusão: a linha fica no banco com o `deleted_at` preenchido.

## Testes

- `src/models/produtos.test.ts`: ordem alfabética com acentos e a marcação de compra eventual.
- `src/models/exclusaoLogica.test.ts`: o produto excluído sai da listagem e mantém a linha, as variantes saem junto, o
  histórico de preços e o item do lançamento continuam ligados a ele, e os itens saem da Lista de compras.
- `src/models/dashboard.test.ts`: as consultas do histórico do produto.
- `src/utils/busca.test.ts`: `correspondeBusca`.

## Observações

- A categoria aqui é a **categoria de produto** (tabela `categorias`), diferente da categoria de lançamento.
