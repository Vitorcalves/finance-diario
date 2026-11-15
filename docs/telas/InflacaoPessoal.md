# Inflação pessoal

Aba **Análises** · rota `InflacaoPessoal` (pilha `DashboardStack`) · pasta `src/views/InflacaoPessoal` · título
"Inflação pessoal", subtítulo "Quanto a sua cesta de compras subiu"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Mostra quanto a cesta de compras de verdade subiu mês a mês: os preços vêm do histórico de preços, e o peso de cada
item vem do que foi comprado. É a inflação de quem usa o app, e não a do índice oficial: se o café que você compra
subiu 20% e ele pesa muito na sua cesta, é isso que aparece.

## Navegação

- **Entrada:** cartão "Inflação pessoal" do [hub de Análises](Dashboard.md). Não recebe parâmetros.
- **Saída:** tocar num item da lista "O que mais pesou" abre a [Análise de preços](AnalisePrecos.md) já no produto
  (`{ produtoId }`), na mesma pilha; o voltar traz para cá.
- Voltar do header.

## Funcionalidades

### Período

Chips **6 meses**, **12 meses** (padrão) e **Tudo**. O período só escolhe de onde o acumulado parte: a variação de um
mês é a mesma em qualquer recorte. Com menos histórico que o período, mostra o que houver.

### Resumo (`ResumoInflacao`)

- "Acumulado em N meses", com o percentual em destaque e o ícone de tendência (vermelho subiu, verde caiu).
- "De out/25 a out/26" e a frase "O que custava R$ 100,00 em out/25 custa R$ 108,40 em out/26."
- Três caixas: **Último mês**, **Média por mês** (a taxa que, composta, dá o acumulado) e **Itens na cesta** (itens
  comparados em algum mês do período).

### Gráfico (`GraficoInflacao`)

- Chips **Mês a mês** e **Acumulado** trocam o que o mesmo gráfico mostra (uma escala por vez).
- **Mês a mês:** uma barra por mês saindo da linha do zero, para cima (vermelha, a cesta subiu) ou para baixo (verde,
  caiu). Variação pequena ainda desenha uma barra de 2 px; mês sem variação fica sem barra.
- **Acumulado:** linha azul a partir do mês base (0%), com a área até o zero. Até 13 pontos, mostra um ponto por mês.
- Eixo vertical em marcas "redondas" e sempre com o zero; eixo horizontal com até 6 meses, de tantos em tantos e
  sempre com o mais recente (o primeiro rótulo e os de janeiro levam o ano: "jan/26").
- Tocar no gráfico escolhe o mês mais próximo (vibra): a faixa do mês fica marcada nas barras, e a linha ganha uma
  guia tracejada e um ponto maior. Sem toque, o destaque é o mês mais recente.
- Abaixo, o detalhe do mês em destaque: nome por extenso, **No mês**, **Acumulado desde <base>** e "N de M itens com
  preço registrado no mês; os outros repetem o último preço." (ou "Nenhum item da cesta com preço para comparar neste
  mês.").

### O que mais pesou (`ItensInflacao`)

- Itens que mudaram de preço no período, do maior impacto (para cima ou para baixo) ao menor: seta, produto, variante,
  "R$ 22,50 → R$ 24,90 · 25% da cesta", a variação do preço e o impacto em pontos percentuais ("+0,85 p.p.").
- Mostra 8 e o botão "Ver todos (N)" / "Mostrar menos".
- Rodapé "N itens ficaram com o mesmo preço no período."; sem nenhuma mudança, "Nenhum item mudou de preço neste
  período.".
- Tocar no item abre a Análise de preços do produto. Item cuja variante sumiu do cadastro não abre nada.

### Como é calculado (`ComoCalculado`)

Cartão fixo com as quatro regras da conta (item, preço do mês, peso e impacto), para o número não parecer mágico.

### Estados

- Menos de dois meses com preço registrado: "Ainda não dá para calcular", com a dica de lançar compras com itens de
  produto (com a marca) em pelo menos dois meses.
- Período sem nenhum item com peso (só cotações, nenhuma compra): os chips de período continuam e aparece "Nenhum
  item da cesta neste período".

## Arquivos

| Arquivo                            | Papel                                                              |
|------------------------------------|--------------------------------------------------------------------|
| `index.tsx`                        | Header, chips de período, estados vazios e os blocos               |
| `useInflacaoPessoal.ts`            | Carga, período, modo do gráfico, mês em destaque e nomes dos itens |
| `grafico.ts`                       | Funções puras: escala, rótulos de mês, formatos e desenho da barra |
| `types.ts`                         | `PeriodoInflacao`, `ModoGrafico`, `ItemDaCesta`                    |
| `components/ResumoInflacao.tsx`    | Acumulado, frase de exemplo e as três caixas                       |
| `components/GraficoInflacao.tsx`   | Gráfico SVG (barras ou linha) com toque e o detalhe do mês         |
| `components/ItensInflacao.tsx`     | Lista dos itens por impacto                                        |
| `components/ComoCalculado.tsx`     | Regras da conta                                                    |

```
InflacaoPessoalView
├── ScreenHeader (voltar)
└── LoadingState | EmptyState | ScrollView
    ├── ChipSelector (período)
    ├── EmptyState (período sem cesta)
    ├── ResumoInflacao
    ├── GraficoInflacao (ChipSelector + Svg + detalhe do mês)
    ├── ItensInflacao → AnalisePrecos
    └── ComoCalculado
```

## Lógica

### Carga (`useInflacaoPessoal`)

A cada foco, em paralelo: `listHistoricoPreco()`, `listComprasDeVariantes()`, `listProdutos()`,
`listProdutoVariantes()` e `listMarcas()`, os três cadastros com `{ comExcluidos: true }`. O indicador de carregamento
aparece só na primeira carga. O cálculo roda em memória (`useMemo`) com `mesFinal` = mês corrente: o mês em andamento
entra, e registros com data futura ficam de fora.

Produto ou variante excluído continua na cesta, com nome: a exclusão é lógica (ver [Base comum](README.md), seção
"Exclusão lógica dos cadastros"), então o histórico de preços e as compras dele não somem. Ele sai da cesta sozinho,
12 meses depois da última compra, como qualquer item que deixou de ser comprado.

### A conta (`calcularInflacao`, em `src/utils/inflacaoPessoal.ts`)

É um índice de preços encadeado:

1. **Item** é a variante (mesma marca, mesma embalagem). Comparar por produto misturaria troca de marca com aumento.
2. **Preço do mês:** média dos registros do histórico de preços da variante no mês (pagos e cotados, de qualquer
   mercado). Mês sem registro **repete o último preço conhecido**; a mudança aparece no mês em que o item volta a ter
   preço. Por isso um mês com poucas compras tende a variar pouco, e o acumulado é mais confiável que um mês isolado.
3. **Peso:** quanto foi gasto na variante nos últimos 12 meses (`JANELA_PESOS`), contando o mês da conta. Item só
   cotado, nunca comprado, tem peso zero e fica fora da cesta; item que deixou de ser comprado sai dela depois de 12
   meses.
4. **Variação do mês:** média ponderada pelo peso de `preço do mês ÷ preço do mês anterior`, entre os itens que têm os
   dois preços. Item novo entra na comparação no mês seguinte ao primeiro preço. Sem nenhum item comparável, a
   variação do mês é `null` (o acumulado não muda).
5. **Acumulado:** encadeia as variações a partir do mês base do período (o mês anterior ao primeiro mostrado).
6. **Impacto do item:** em cada mês, `índice até o mês anterior × fatia do item × (preço ÷ preço anterior − 1)`,
   somado no período. A soma dos impactos de todos os itens é exatamente o acumulado.

A série vai do primeiro ao último mês com algum preço registrado. O resultado traz `mesBase`, `meses` (`variacao`,
`acumulado`, `itens`, `itensComPrecoNovo`), `acumulado` (`null` quando nenhum mês teve item comparável) e `itens`
(`precoInicial`, `precoFinal`, `variacao`, `impacto`, `participacao`).

### Gráfico e textos (`grafico.ts`)

- `escalaVariacao`: limites em passos de 1, 2 ou 5 × 10^n, sempre com o zero; tudo zero abre de 0 a 1.
- `caminhoBarra`: barra da linha do zero até o valor, com só a ponta arredondada.
- `marcasEixoMeses`, `colunaMaisProxima`, `posicaoY`, `rotuloMarca`.
- `formatarVariacao` ("+8,4%"; o que arredonda para zero sai "0%", sem sinal), `formatarPontos` ("+0,85 p.p."),
  `formatarFatia` ("25%", "<1%"), `mediaMensal`, `rotuloMes` ("out/26") e `nomeDoMes` ("Outubro de 2026").

## Models e tabelas

| Função                   | Módulo                | Tabelas                                          |
|--------------------------|-----------------------|--------------------------------------------------|
| `listHistoricoPreco`     | `historicoPreco.ts`   | `historico_preco`                                |
| `listComprasDeVariantes` | `dashboard.ts`        | `itens_transacao` + `transacoes` (data)          |
| `listProdutos`           | `produtos.ts`         | `produtos`                                       |
| `listProdutoVariantes`   | `produtoVariantes.ts` | `produto_variantes`                              |
| `listMarcas`             | `marcas.ts`           | `marcas`                                         |

`listComprasDeVariantes` devolve o total de cada item (preço unitário × quantidade) com a data da transação; item sem
variante fica de fora, porque não gera registro no histórico de preços. A tela só lê: não grava nada e não tem
migration.

## Testes

- `src/utils/inflacaoPessoal.test.ts`: encadeamento, pesos, item só cotado, mês sem registro, média do mês, item novo,
  janela de 12 meses, mês final, dados inválidos, recorte do período e impactos (soma = acumulado).
- `src/views/InflacaoPessoal/grafico.test.ts`: rótulos, formatos, escala, marcas do eixo, barra e coluna mais próxima.
- `src/models/dashboard.test.ts`: `listComprasDeVariantes`.

## Observações

- O número depende do que foi registrado. Um preço digitado errado (R$ 249,00 no lugar de R$ 24,90) vira um salto
  na cesta. A lista "O que mais pesou" mostra o item, mas hoje nenhuma tela apaga um registro do histórico de preços
  (`deleteHistoricoPrecoById` existe no model, sem uso); pendência em Tarefas.
- Editar a embalagem de uma variante (de 1 kg para 5 kg) muda o preço dela sem ser inflação: a conta não distingue.
- Excluir um produto ou uma variante não muda a série: o histórico e as compras dele continuam na conta.
- A comparação é só da cesta com ela mesma; não há índice oficial (IPCA) na tela.
