# Gastos do mês

Aba **Mês** · rota `GastosMensais` (tela da aba, sem pilha) · pasta `src/views/Mensal` · título "Gastos do mês",
subtítulo "Como o gasto evolui do dia 1 até o fim do mês"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Mostra o ritmo do gasto de um mês, do dia 1 ao último: quanto já foi gasto, a comparação com o mesmo período do mês
passado, o que ainda vai vencer, a projeção de fechamento e quatro gráficos (acumulado, por dia, por categoria e por
localidade). Dá para navegar para meses passados e futuros.

## Navegação

- **Entrada:** aba Mês. Não recebe parâmetros e abre no mês corrente.
- **Saída:** tocar numa categoria do gráfico "Por categoria" troca para a aba Início e abre a
  [Busca de lançamentos](BuscaLancamentos.md) filtrada por aquela categoria (ou "Sem categoria") e pelo período do mês
  exibido.
- Como a aba não tem pilha, não há voltar; o mês escolhido fica guardado enquanto o app está aberto.

## Funcionalidades

### Seletor de mês (`SeletorMes`)

- Setas de mês anterior e próximo mês (com vibração), nome do mês e ano. Um indicador gira enquanto o mês novo carrega,
  com o mês anterior ainda na tela.
- Arrastar a área dos gráficos para o lado também troca de mês (arrasto horizontal de pelo menos 60 px, bem mais
  horizontal que vertical), como virar a página de uma agenda. O conteúdo entra deslizando do lado para onde se
  navegou.
- Fora do mês corrente, o header ganha o botão "Voltar para o mês atual" (ícone de hoje).
- Puxar para baixo recarrega o mês.

### Resumo (`ResumoMes`)

- "Gasto até hoje" (mês corrente) ou "Gasto no mês", com o período "1 a N de <mês> - D dia(s) com gasto". No mês
  futuro: "D dia(s) com gasto já lançado".
- Variação contra o mês passado **no mesmo ponto** ("+12% vs. R$ X no mesmo período do mês passado"), vermelha quando
  subiu e verde quando caiu. Só aparece quando o mês passado tem gasto até aquele dia.
- "+ R$ X em parcelas e assinaturas a vencer neste mês", quando há comprometido.
- Duas caixas: **Média por dia** e **Projeção do mês** (mês corrente ou futuro) ou **Entradas** (mês passado).

### Acumulado (`GraficoAcumulado`)

- Curva suave do gasto realizado somado dia a dia, com área em gradiente, e a escala (valor do topo) no título.
- No mês corrente: ponto de hoje destacado e a projeção tracejada de hoje até o fim do mês.
- Linha tracejada de referência com o total fechado do mês passado ("Mês passado fechou em R$ X").
- Legenda: Gasto realizado, Projeção (mês corrente) e a referência do mês passado.
- A curva "cresce" a partir da base a cada mês novo.

### Por dia (`GraficoDiario` + `DetalheDia`)

- Uma barra por dia com o gasto realizado; dias de fim de semana, o dia de hoje e o dia selecionado têm cores
  próprias. Parcelas e assinaturas com vencimento futuro aparecem como barra "comprometida".
- "Maior dia: DD/MM (ddd) - R$ X".
- Tocar numa barra abre, abaixo, o detalhe do dia: data por extenso, total e os lançamentos (descrição, empresa e
  valor). Tocar de novo fecha. Sem barra escolhida: "Toque em uma barra para ver o dia.".

### Por categoria (`GraficoCategoria`)

- Barra de composição com uma fatia por categoria, na cor dela, e a lista do maior para o menor gasto: ícone, nome,
  quantidade de lançamentos, valor e percentual. Cada linha leva à busca filtrada.
- Com gasto sem categoria, uma dica ensina a categorizar deslizando o lançamento na lista.
- Só o gasto já realizado entra.

### Por localidade (`GraficoLocal`)

- Uma barra horizontal por local de compra (Muriaé, Viçosa) com o valor e "N% do gasto do mês". A cor é fixa por local,
  para não trocar de mês a mês conforme o ranking.
- Só o realizado entra; local sem gasto não aparece.

### Mês vazio

Sem nenhum lançamento no mês: "Nenhum lançamento neste mês" e a dica de registrar um gasto na tela inicial.

## Arquivos

| Arquivo                          | Papel                                                                     |
|----------------------------------|---------------------------------------------------------------------------|
| `index.tsx`                      | Header, seletor, gesto de arrastar, animação e os blocos                  |
| `useMensal.ts`                   | Carga do mês e todos os números derivados                                 |
| `types.ts`                       | `DiaDoMes`, `ResumoMes`, `ComparativoMes`, `DetalheDoDia`, `GastoPorLocal`, `GastoPorCategoria` |
| `charts.ts`                      | Alturas, proporções e a curva monótona dos gráficos                       |
| `components/SeletorMes.tsx`      | Navegação entre meses                                                     |
| `components/ResumoMes.tsx`       | Cartão de resumo                                                          |
| `components/GraficoAcumulado.tsx`| Curva do acumulado com projeção e referência                              |
| `components/GraficoDiario.tsx`   | Barras por dia                                                            |
| `components/DetalheDia.tsx`      | Lançamentos do dia escolhido                                              |
| `components/GraficoCategoria.tsx`| Composição e lista por categoria                                          |
| `components/GraficoLocal.tsx`    | Barras por local                                                          |
| `components/EixoDias.tsx`        | Marcas 1, 8, 15, 22 e o último dia do eixo                                |

```
MensalView
├── ScreenHeader (botão "mês atual" fora do mês corrente)
└── ScrollView (puxar para atualizar)
    ├── SeletorMes
    └── Animated.View (gesto de arrastar)
        ├── EmptyState (mês vazio)
        ├── ResumoMes
        ├── GraficoAcumulado (Svg) + EixoDias
        ├── GraficoDiario + EixoDias → DetalheDia
        ├── GraficoCategoria
        └── GraficoLocal (BarraProgresso)
```

## Lógica (`useMensal`)

### Carga

A cada foco e a cada troca de mês (ou "puxar"), em `useFocusEffect`:

1. `materializarPlanos(fimDoMes)`: abrir um mês futuro já gera as assinaturas dele, para a projeção nascer com os
   compromissos conhecidos.
2. Em paralelo: `listTransacoes(início, fim do mês, { fluxoGastos: true })`, o mesmo para o mês anterior,
   `listEmpresas()` e `listCategoriasLancamento()`.

A visão é a de gastos: `movimento` e `compra_cartao` (a compra no cartão conta no mês da compra); pagamento de fatura e
transferências ficam de fora, para não somar o mesmo gasto duas vezes. `ultimaBusca` garante que só a busca mais
recente entra na tela quando o usuário troca de mês rápido. Os números são sempre do mês que está na tela, mesmo
durante a busca do próximo.

### Situação do mês

- `mesCorrente`, `mesFuturo` ou passado (`SituacaoMes`).
- `diasDecorridos`: 0 no mês futuro, o dia de hoje no mês corrente e todos os dias no mês passado. É a base da média e
  da projeção.

### Derivados

- **`dias`:** um `DiaDoMes` por dia, com gasto realizado (data até hoje), comprometido (data futura), entrada,
  acumulado, fim de semana, futuro e hoje.
- **`resumo`:** `projetarMes(transacoes, { hoje, situacao, diasDecorridos, diasNoMes })` dá gasto realizado, entradas,
  média diária, média dos gastos avulsos, comprometido e projeção; mais os dias com gasto e o maior dia.
- **`comparativo`:** total do mês anterior, total do mês anterior até o mesmo dia (`dia <= diasDecorridos`) e a
  variação percentual contra ele (`null` sem base). Comparar com o mesmo ponto não pune o mês em andamento.
- **`projecaoPorDia`** (só no mês corrente): parte do realizado e soma, em cada dia que falta, o comprometido daquele
  dia mais a média diária dos gastos avulsos.
- **Escalas:** acumulado = maior entre realizado, projeção, total do mês passado e 1; diária = maior gasto ou
  comprometido de um dia.
- **`gastoPorCategoria`** e **`gastoPorLocal`:** só saídas já realizadas, ordenadas do maior para o menor.
- **`detalheDia`:** o dia escolhido e os lançamentos dele.

### Projeção (`utils/projecaoMes.ts`)

| Situação  | Projeção                                                                   |
|-----------|----------------------------------------------------------------------------|
| Passado   | Gasto realizado (o mês já fechou)                                          |
| Corrente  | Realizado + comprometido + média diária dos gastos sem plano × dias que faltam |
| Futuro    | Só o comprometido (parcelas e assinaturas já geradas)                      |

Parcelas e assinaturas entram pelo valor exato e não inflam a média. A Home usa a mesma função, então as duas telas
nunca mostram projeções diferentes para o mesmo mês.

### Gráficos (`charts.ts`)

- `alturaBarra`: barra com valor tem pelo menos 3 px, para um gasto pequeno não sumir.
- `alturaProporcional`: posição do valor no gráfico, sem passar do topo.
- `caminhoSuave`: interpolação cúbica monótona (Fritsch-Carlson, como o `curveMonotoneX` do d3). A curva do acumulado
  passa por todos os pontos e nunca desce entre dois dias. `caminhoArea` fecha a mesma curva até a base.

## Models e tabelas

| Função                     | Módulo                     | Tabelas                                          |
|----------------------------|----------------------------|--------------------------------------------------|
| `materializarPlanos`       | `materializacaoPlanos.ts`  | `planos_pagamento`, `transacoes`, `faturas`, `transacoes_tags` |
| `listTransacoes`           | `transacoesModel.ts`       | `transacoes`                                     |
| `listEmpresas`             | `empresas.ts`              | `empresas`                                       |
| `listCategoriasLancamento` | `categoriasLancamento.ts`  | `categorias_lancamento`                          |

Utilitários: `projetarMes` (`utils/projecaoMes.ts`), `Locais` (`utils/local.ts`), `toCurrency` e `toCurrencyCurto`
(`utils/format.ts`), `vibrarSelecao` (`utils/haptics.ts`).

## Testes

- `src/views/Mensal/charts.test.ts`: alturas, proporções e a curva.
- `src/utils/projecaoMes.test.ts`: projeção nas três situações.
- `src/models/lancamentos.test.ts`: o fluxo de gastos inclui a parcela no cartão e exclui o pagamento da fatura.
- `src/models/materializacaoPlanos.test.ts`: a entrada programada entra como receita do mês.

## Observações

- Os locais (Muriaé, Viçosa) são um catálogo fixo em `utils/local.ts`, sem tabela; o local de cada lançamento vem da
  preferência "Local padrão" do Menu.
- O limite mensal por categoria (Tarefas, item 6) deve usar a projeção que esta tela já calcula.
