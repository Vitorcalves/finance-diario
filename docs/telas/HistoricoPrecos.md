# Histórico de Preços

Aba **Análises** · rota `HistoricoPrecos` (pilha `DashboardStack`) · pasta `src/views/HistoricoPrecos` · título
"Histórico de Preços"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Lista todos os preços já registrados no histórico, agrupados por variante (marca e embalagem) ou por produto, com o
preço atual, o menor, o maior e a média de cada grupo. Destaca o grupo com o menor preço atual e, quando as medidas
permitem, compara pelo preço por unidade (R$/kg), o único jeito justo de comparar embalagens de tamanhos diferentes.
Dá para filtrar por produto ou pelo código de barras lido na câmera.

## Navegação

- **Entrada:** cartão "Histórico de preços" do [hub de Análises](Dashboard.md). (A Home tinha um atalho "Preços" para
  cá, hoje comentado no código.)
- **Saída:** voltar do header. Não recebe parâmetros.

## Funcionalidades

### Filtros (`FiltrosHistorico`)

- **Produto:** `SeletorMultiplo` de escolha única com busca ("Todos os produtos" / "Trocar produto"). Tocar de novo no
  escolhido tira o filtro.
- **Código de barras:** o botão ao lado abre a câmera. Achada a variante pelo código, o filtro passa a ser o produto
  dela e, comparando por variante, a própria variante. Um cartão mostra o código lido e a variante (ou "Filtrando pelo
  produto da variante lida"), com X para limpar. Código desconhecido: "Nenhuma variante cadastrada com o código ...".
- **Comparar por:** Variante (padrão) ou Produto.
- **Ordenar por:** Menor preço atual (padrão), Mais recente ou Nome.
- Trocar produto ou agrupamento limpa o filtro de código e fecha os cartões abertos.

### Cartão do grupo (`GrupoPrecoCard`)

- Título e subtítulo: por variante, "Marca • 1 kg" e o nome do produto; por produto, o nome e "N registro(s) de
  preço".
- Selo **Melhor preço** (ou **Melhor por kg**) no grupo com o menor preço atual, quando há dois grupos ou mais; o
  cartão fica destacado.
- Três métricas: **Atual** (com a data), **Menor** (com o mercado) e **Maior** (com a média).
- Por variante, com medida cadastrada: "R$ 8,90/kg no preço atual • menor já pago R$ 7,50/kg".
- Por produto, com medida comparável, as métricas ficam por unidade ("Atual (por kg)"), porque o grupo junta
  embalagens de tamanhos diferentes. Avisos quando não dá: variantes sem quantidade/unidade, medidas de grupos
  diferentes, ou "N registro(s) fora da comparação por não terem medida cadastrada".
- Com mais de um registro: "+12,5% acima do menor preço já pago" ou "Está no menor preço já registrado".
- Tocar no cabeçalho abre a lista de registros, do mais recente para o mais antigo: data, mercado (e a variante, no
  agrupamento por produto), preço (verde quando é o menor do grupo) e o preço por unidade.

### Estados

- Sem registros: "Nenhum preço registrado ainda" (ou "... para este filtro"), com a dica de que os preços são
  registrados ao lançar itens com variante.

## Arquivos

| Arquivo                             | Papel                                                                  |
|-------------------------------------|------------------------------------------------------------------------|
| `index.tsx`                         | Header, filtros e a lista de grupos                                    |
| `useHistoricoPrecos.ts`             | Carga, filtros, agrupamento, métricas, ordenação e o melhor preço      |
| `normalizacao.ts`                   | Redução à unidade primária e a base de comparação entre grupos         |
| `types.ts`                          | `Agrupamento`, `Ordenacao`, `GrupoPreco`, `Normalizacao`, `BaseComparacao` |
| `components/FiltrosHistorico.tsx`   | Produto, código de barras, agrupamento e ordenação                     |
| `components/GrupoPrecoCard.tsx`     | Cartão do grupo com métricas e registros                               |

```
HistoricoPrecosView
├── ScreenHeader (voltar)
└── KeyboardAvoidingScreen → ScrollComTeclado
    ├── FiltrosHistorico (SeletorMultiplo + scanner, ChipSelector × 2)
    └── EmptyState | GrupoPrecoCard*
```

## Lógica (`useHistoricoPrecos`)

### Carga

A cada foco: `listHistoricoPreco()` (todo o histórico), `listProdutos()`, `listProdutoVariantes()`, `listMarcas()` e
`listEmpresas()`. Todo o resto é calculado na tela.

### Montagem dos grupos

1. Filtra por produto e, se houver, pela variante do código lido.
2. Agrupa por `variante_id` ou `produto_id`.
3. Em cada grupo: ordena do mais recente para o mais antigo; calcula atual (o mais recente), menor, maior e média do
   preço cheio; e o preço por unidade de cada registro (`precoPorUnidadePrimaria`).
4. `normalizarGrupo`: as mesmas métricas por unidade primária. Registros sem medida ficam de fora (e são contados);
   medidas de grupos diferentes (massa com unidade avulsa) tornam a normalização inválida.
5. `definirBaseComparacao`: compara os grupos **por unidade** só quando todos reduzem à mesma unidade primária; senão,
   pelo preço cheio. Misturar R$/kg com R$ da embalagem daria um "melhor preço" sem sentido.
6. Ordena pela opção escolhida (`valorComparavel` no menor preço atual).
7. **Melhor preço:** o menor `valorComparavel` entre os grupos, só com dois grupos ou mais.

Nomes que sumiram do cadastro aparecem como "Produto removido", "Sem empresa" ou "Variante removida".

## Models e tabelas

| Função                    | Módulo                 | Tabelas              |
|---------------------------|------------------------|----------------------|
| `listHistoricoPreco`      | `historicoPreco.ts`    | `historico_preco`    |
| `listProdutos`            | `produtos.ts`          | `produtos`           |
| `listProdutoVariantes`    | `produtoVariantes.ts`  | `produto_variantes`  |
| `listMarcas`              | `marcas.ts`            | `marcas`             |
| `listEmpresas`            | `empresas.ts`          | `empresas`           |

`historico_preco` guarda produto, variante, mercado, preço, data (com hora), local e `created_at`. Recebe registros de:
itens com variante em qualquer lançamento (`registrarLancamento` → `registrarPrecoVariante`), "Salvar preços no
histórico" e o fechamento da Lista de compras, e a pesquisa do Orçamento.

Utilitários: `precoPorUnidadePrimaria` e `rotuloVariantePorId` (`utils/variantes.ts`), `toCurrencyPorUnidade` e
`toPercent` (`utils/format.ts`).

## Testes

- `src/views/HistoricoPrecos/normalizacao.test.ts`: normalização por grupo, registros sem medida, unidades
  incompatíveis e a base de comparação.
- `src/utils/variantes.test.ts` e `src/utils/unidades.test.ts`.

## Observações

- A tela lê o histórico inteiro e agrupa na memória; com muitos anos de registros, pode ficar mais lenta.
- O título usa "Preços" com P maiúsculo, diferente do cartão do hub ("Histórico de preços").
