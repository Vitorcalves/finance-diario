# Análise de preços

Aba **Análises** · rota `AnalisePrecos` (pilha `DashboardStack`) · pasta `src/views/AnalisePrecos` · título "Análise
de preços", subtítulo "Valor pago x histórico de preços"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Mostra, num gráfico de linhas, quanto o usuário pagou por um produto ao longo do tempo (os itens dos lançamentos)
contra o histórico de preços do produto (pagos e cotados). Dá para filtrar por variante e, quando as medidas batem,
comparar pelo preço por unidade base (R$/kg, R$/L, R$/un). Um cartão resume o último preço pago, a variação, a faixa e
o último registro do histórico.

## Navegação

- **Entrada:** cartão "Análise de preços" do [hub de Análises](Dashboard.md), ou um item da lista "O que mais pesou"
  da [Inflação pessoal](InflacaoPessoal.md).
- **Parâmetro:** `AnalisePrecos: { produtoId?: string }`, que pré-seleciona o produto. Quem passa é a Inflação
  pessoal; pelo hub a tela abre no produto mais movimentado.
- **Saída:** voltar do header.

## Funcionalidades

### Filtros (`FiltrosAnalise`)

- **Produto:** chips com os produtos que têm alguma compra ou preço registrado, do mais movimentado para o menos. Sem
  produto escolhido (ou com um que sumiu), a tela escolhe o mais movimentado. O produto excluído continua na lista,
  depois dos ativos e marcado "(excluído)": o histórico dele não é apagado, e é aqui que ele pode ser visto.
- **Variante:** só aparece quando o produto tem mais de uma variante nos dados; "Todas" e uma por variante, em ordem
  alfabética.
- **Preço por kg** (caixa de marcar): só aparece quando todos os registros com medida reduzem à mesma unidade base.
  Com ela marcada, os registros sem medida ficam de fora e a tela avisa quantos ("N registro(s) sem medida cadastrada
  ficaram de fora."). A escolha continua ligada ao trocar de produto: quem compara por kg quer comparar todos assim;
  num produto sem base comum, os valores voltam ao preço do produto.

### Resumo (`ResumoPrecosCard`)

- **Último pago** e a variação contra a compra anterior ("+12,5% vs. compra anterior"; vermelho subiu, verde caiu).
- **Último no histórico** e quantos registros.
- **Menor pago**, **Maior pago** e **Compras**.
- Por unidade, os valores aparecem como "R$ 8,90/kg" (até 4 casas abaixo de R$ 1,00).

### Gráfico (`GraficoLinhas`)

- Título "Preço ao longo do tempo" (ou "Preço por kg ao longo do tempo").
- Duas linhas na mesma escala: **Valor pago** (cor da marca) e **Histórico de preços** (azul). A legenda marca "(sem
  dados)" na série vazia.
- Um ponto por dia: várias compras no mesmo dia, ou cotações de mercados diferentes, viram a média do dia.
- Eixo vertical com 4 marcas "redondas" (passos de 1, 2 ou 5 × 10^n), com centavos quando alguma marca cai entre dois
  reais; eixo horizontal com até 4 datas.
- Tocar no gráfico destaca o ponto mais próximo (entre as duas séries) com uma linha vertical tracejada e mostra a
  data, o valor e "pago" ou "no histórico" (e "média de N registros", quando for o caso).
- Trocar produto, variante ou escala zera o ponto selecionado (o gráfico é remontado por `key`).

### Estados

- Nenhum produto com dados: "Nenhum produto com compra ou preço registrado", com a dica de lançar compras com itens.
- Filtro sem dados: "Sem preços para este filtro".

## Arquivos

| Arquivo                           | Papel                                                                   |
|-----------------------------------|-------------------------------------------------------------------------|
| `index.tsx`                       | Header, filtros, resumo e gráfico                                       |
| `useAnalisePrecos.ts`             | Catálogo, carga das séries do produto, filtro, unidade base e resumo    |
| `series.ts`                       | Funções puras: agrupar por dia, unidade base, domínio, projeção e resumo |
| `types.ts`                        | `Serie`, `PontoSerie`, `UnidadeBase`, `Dominio`, `ResumoPrecos`...      |
| `components/FiltrosAnalise.tsx`   | Chips de produto e variante e a caixa "Preço por kg"                    |
| `components/ResumoPrecosCard.tsx` | Números-chave                                                           |
| `components/GraficoLinhas.tsx`    | Gráfico SVG com toque                                                   |

```
AnalisePrecosView
├── ScreenHeader (voltar)
└── ScrollView
    ├── FiltrosAnalise (ChipSelector × 2 + caixa)
    ├── ResumoPrecosCard
    └── GraficoLinhas (Svg)
```

## Lógica (`useAnalisePrecos`)

### Carga

- A cada foco: `listProdutosComMovimento()` (traz também os excluídos, com `deleted_at`, depois dos ativos),
  `listProdutoVariantes({ comExcluidos: true })` e `listMarcas({ comExcluidos: true })`. Variantes e marcas vêm com as
  excluídas para o chip e o cálculo por unidade continuarem valendo no histórico delas (ver [Base comum](README.md),
  seção "Exclusão lógica dos cadastros").
- A cada troca de produto (`useEffect`): `listPrecosPagosPorProduto(produtoId)` e `listHistoricoPorProduto(produtoId)`.
  O resultado é guardado junto com o id do produto; enquanto a leitura nova não chega, os dados do produto anterior são
  ignorados.

### Cálculo

1. **Variantes do filtro:** as que aparecem nas compras ou no histórico do produto.
2. **Registros:** filtra pela variante e calcula o preço por unidade de cada registro (`precoPorUnidadePrimaria`).
3. **Unidade base** (`definirUnidadeBase`): `semMedida` (ninguém tem medida), `unidadesIncompativeis` (kg com un, por
   exemplo) ou `ok` com a sigla e quantos registros ficaram sem medida.
4. **Séries:** `valoresNaBase` (preço do produto ou por unidade) → `agruparPorDia` (média do dia).
5. **Resumo** (`resumirPrecos`): último, anterior, menor e maior da série paga; último do histórico; contagens.

### Escala do gráfico (`calcularDominio`)

- Tempo do primeiro ao último dia; com um dia só, abre um dia para cada lado.
- Valores: com todos iguais, abre 10% (ou R$ 1). Com valores próximos, trata a variação como de pelo menos 10% do
  maior valor e 4 centavos, para uma fração de centavo (R$ 4,998 x R$ 5,00/kg) não virar um sobe e desce no gráfico
  inteiro. Mínimo nunca abaixo de zero.

## Models e tabelas

| Função                       | Módulo                | Tabelas                                                   |
|------------------------------|-----------------------|-----------------------------------------------------------|
| `listProdutosComMovimento`   | `dashboard.ts`        | `produtos`, `itens_transacao`, `historico_preco`          |
| `listPrecosPagosPorProduto`  | `dashboard.ts`        | `itens_transacao` + `transacoes` (data, empresa, local)   |
| `listHistoricoPorProduto`    | `dashboard.ts`        | `historico_preco` (data sem hora)                         |
| `listProdutoVariantes`       | `produtoVariantes.ts` | `produto_variantes`                                       |
| `listMarcas`                 | `marcas.ts`           | `marcas`                                                  |

O "valor pago" é o preço unitário de cada item de lançamento com o produto (na compra parcelada, os itens ficam no
registro da compra, a parcela 0). O histórico recebe tanto os preços pagos (cada item com variante gera um registro)
quanto as cotações levadas da Lista de compras e do Orçamento.

## Testes

- `src/views/AnalisePrecos/series.test.ts`: agrupamento por dia, unidade base, domínio e ticks, projeção, ponto mais
  próximo e resumo.
- `src/models/dashboard.test.ts`: as três consultas.
- `src/models/exclusaoLogica.test.ts`: o produto excluído continua em `listProdutosComMovimento`, depois dos ativos.
- `src/utils/variantes.test.ts`: preço por unidade primária.

## Observações

- O parâmetro `produtoId` só vale na abertura da tela (é o estado inicial do hook). A Inflação pessoal sempre abre
  uma tela nova, então isso basta; a lista de Produtos continua abrindo o histórico em modal, não esta tela.
