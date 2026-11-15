# Assinaturas e parcelas

Aba **Menu** · rota `Planos` (pilha `MenuStack`) · pasta `src/views/Planos` · título "Assinaturas e parcelas",
subtítulo "Gastos que se repetem sozinhos todo mês"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Lista os planos de pagamento: as **assinaturas** (streaming, academia, plano do celular) e as **entradas programadas**
(salário), cadastradas aqui, e os **parcelamentos**, que nascem no lançamento de uma compra parcelada e aparecem aqui
só para acompanhar. Mostra quanto as assinaturas pesam por mês, o que ainda vai vencer e, em cada plano, o progresso e
a próxima cobrança. Encerrar para as cobranças futuras; excluir apaga o plano inteiro.

## Navegação

- **Entrada:** Menu › Financeiro › Assinaturas e parcelas. (A Home tinha um atalho "Assinaturas" para cá, hoje
  comentado no código.)
- **Saída:** só o voltar do sistema: o header tem o "+" mas não a seta de voltar.

## Conceitos

- **Plano** (`planos_pagamento`): a regra. Cada cobrança vira uma linha real em `transacoes` (com `plano_id` e
  `parcela_numero`), para toda tela que lê lançamentos funcionar sem conhecer planos.
- **Parcelamento:** total e número de parcelas conhecidos; todas as parcelas são geradas de uma vez no lançamento da
  compra. A parcela 0 é o registro da compra (valor cheio e itens), fora de qualquer saldo.
- **Assinatura:** sem fim previsto; as cobranças são geradas sob demanda até um horizonte (o fim do mês corrente, ou o
  fim do mês aberto na tela Mês). `gerado_ate` marca até onde o gerador chegou.
- **Entrada programada (salário):** uma assinatura com `conta_destino_id`; cada cobrança entra como valor positivo no
  caixa escolhido, sem origem: é renda, não gasto.

## Funcionalidades

### Resumo (`ResumoPlanos`)

- **Assinaturas por mês:** soma do custo mensal equivalente das assinaturas ativas (semanal × 52/12; anual ÷ 12).
- **A vencer neste mês:** cobranças com data depois de hoje e até o fim do mês, e "R$ X no total" com todas as que
  ainda vão vencer (inclusive meses seguintes).
- Os salários ficam fora das duas somas.

### Lista

- Duas seções: **Em andamento** (ativo e com próxima cobrança) e **Encerrados** (encerrados à mão ou já quitados).
- Cartão do plano (`PlanoCard`):
  - Ícone: repetição (assinatura), cartão (parcelamento) ou dinheiro verde (salário); apagado quando encerrado.
  - Descrição, "Entrada programada ·" (salário), o ritmo ("Mensal", "Anual" ou "10x de R$ 50,00") e a empresa.
  - Valor da cobrança (com "+" no salário).
  - Parcelamento: barra de progresso "N de M pagas · R$ X" e "Total R$ Y" (verde quando quitado).
  - Assinatura: "Equivale por mês" (frequência não mensal) e "Já pago" / "Já recebido" com quantas cobranças e quanto.
  - "Próxima cobrança" / "Próxima entrada" com a data; ou "Quitado" / "Encerrado em" com a data de fim.
  - Botões **Encerrar** (só em andamento) e **Excluir**.
- Sem planos: "Nenhuma assinatura ou parcelamento", com "Nova assinatura" e a dica de marcar "compra parcelada" ao
  lançar um gasto.

### Nova assinatura (`AssinaturaFormModal`)

Painel "Nova assinatura" ("Streaming, academia, plano do celular..."):

- **Descrição \*** (placeholder "Ex.: Streaming") e **Valor da cobrança (R$) \***.
- **Tipo:** "Cobrança" ou "Salário (entrada)". No salário: "O valor entra no saldo do caixa todo mês, sem origem: é
  renda, não gasto."
- **Categoria:** de saída (começa em "Assinaturas") ou, no salário, de entrada (começa sem categoria).
- **Conta:** caixas e cartões ativos ("Sem escolha, a cobrança cai na caixa padrão. No cartão, cada cobrança entra na
  fatura do ciclo."). No salário, "Para caixa" lista só os caixas e é obrigatório.
- **Frequência:** Semanal, Mensal ou Anual (o intervalo é sempre 1).
- **1ª cobrança \*:** "O dia desta data vira o dia da cobrança em todos os meses seguintes."
- **Empresa** (não aparece no salário). Só as ativas; o plano de uma empresa excluída continua mostrando o nome dela
  no cartão.
- Salário sem descrição vira "Salário — <caixa>".
- Ao salvar, a assinatura é criada e as cobranças até o fim do mês já são geradas. Aviso: "Assinatura "X" criada".

### Encerrar e excluir

- **Encerrar:** "As cobranças de "X" que ainda não venceram serão removidas. O histórico já pago continua no app."
  Marca o plano como inativo com fim hoje, apaga as cobranças com data futura e as faturas que ficaram vazias. Aviso:
  ""X" encerrado".
- **Excluir:** "Todas as cobranças de "X" serão apagadas, inclusive as já pagas. Deseja continuar?" Apaga o plano e, em
  cascata, todas as linhas dele (inclusive o registro da compra com os itens e as tags). Aviso: ""X" excluído".

## Arquivos

| Arquivo                                | Papel                                                       |
|----------------------------------------|-------------------------------------------------------------|
| `index.tsx`                            | Header, resumo, seções e o painel de nova assinatura        |
| `usePlanos.ts`                         | Carga (com materialização), números por plano, resumo e ações |
| `types.ts`                             | `PlanoNaTela`, `ResumoPlanos`, `DadosFormularioAssinatura`  |
| `components/ResumoPlanos.tsx`          | Duas caixas do resumo                                       |
| `components/PlanoCard.tsx`             | Cartão do plano com progresso e ações                       |
| `components/AssinaturaFormModal.tsx`   | Painel de nova assinatura ou salário                        |

```
PlanosView
├── ScreenHeader (+, sem voltar)
├── LoadingState | EmptyState | ScrollView
│   ├── ResumoPlanos
│   ├── "Em andamento": PlanoCard* (BarraProgresso)
│   └── "Encerrados": PlanoCard*
└── AssinaturaFormModal (BottomSheet: ChipSelector, SeletorCategoria, BrazilianDateInput, SeletorMultiplo)
```

## Lógica (`usePlanos`)

### Carga

A cada foco: `materializarPlanos()` (gera as cobranças que faltam até o fim do mês) e, em paralelo, `listPlanos()`,
`listEmpresas({ comExcluidos: true })`, `listCategoriasLancamento()`, `listContasPorTipo('caixa')`, `listContasPorTipo('cartao')` e
`listCobrancasDePlanos()` (todas as cobranças de planos, no caixa e no cartão, sem limite; o registro da compra fica
de fora).

### Números por plano (`naTela`)

- Cobranças do plano; **pagas** = as com data até hoje (quantidade e soma).
- **Próxima cobrança:** `proximaOcorrencia` a partir de hoje, respeitando o total de parcelas e a data de fim. Plano
  ativo sem próxima = **concluído** (quitado).
- **Custo mensal:** `custoMensalEquivalente(valor, frequência, intervalo)`.
- `emAndamento` = ativo e não concluído; `ehEntrada` = tem `conta_destino_id`.

### Gravação

- `salvarAssinatura`: valida descrição, valor, data e o caixa do salário; chama `criarAssinatura` com o valor negativo
  (cobrança) ou positivo (salário), `contaId` (cobrança) ou `contaDestinoId` (salário). `criarAssinatura` grava o plano
  e roda `materializarPlanos` numa transação.
- **Materialização** (`materializacaoPlanos.ts`): `ocorrenciasAte` calcula as datas sempre a partir da data de início
  (uma cobrança do dia 31 cai no dia 28 em fevereiro e volta ao 31 em março); `INSERT OR IGNORE` com o índice único
  (`plano_id`, `parcela_numero`) impede duplicar; cobranças até `gerado_ate` não voltam (uma cobrança apagada à mão
  continua apagada). No cartão, cada cobrança vira `compra_cartao` na fatura do ciclo da própria data. Cada cobrança
  nova herda a categoria do plano e as tags das cobranças existentes. A descrição ganha "(3ª cobrança)" ou "(3/10)".
- `encerrar` → `cancelarPlano(plano)`; `excluir` → `deletePlanoById` (cascata).

## Models e tabelas

| Função                                              | Módulo                    | Tabelas                                     |
|-----------------------------------------------------|---------------------------|---------------------------------------------|
| `listPlanos`, `deletePlanoById`                     | `planosPagamento.ts`      | `planos_pagamento` (+ cascata em `transacoes`) |
| `materializarPlanos`, `criarAssinatura`, `cancelarPlano` | `materializacaoPlanos.ts` | `planos_pagamento`, `transacoes`, `faturas`, `transacoes_tags` |
| `listCobrancasDePlanos`                             | `transacoesModel.ts`      | `transacoes`                                |
| `listContasPorTipo`                                 | `contas.ts`               | `contas`                                    |
| `listEmpresas`, `listCategoriasLancamento`          | vários                    | cadastros                                   |

Colunas principais de `planos_pagamento`: `tipo` (`parcelamento`/`assinatura`), `descricao`, `empresa_id`,
`valor_parcela` (com sinal), `valor_total`, `total_parcelas`, `frequencia`, `intervalo`, `data_inicio`, `data_fim`,
`ativo`, `gerado_ate`, `categoria_id`, `conta_id`, `conta_destino_id`.

Utilitários: `ocorrenciasAte`, `proximaOcorrencia`, `custoMensalEquivalente`, `rotuloParcela`, `ROTULO_FREQUENCIA` e
`dividirEmParcelas` (`utils/parcelas.ts`), `faturaDaCompra` (`utils/cartao.ts`).

## Validações e mensagens

| Situação                         | Mensagem                                                       |
|----------------------------------|----------------------------------------------------------------|
| Sem descrição (cobrança)         | "Descrição da assinatura é obrigatória"                        |
| Valor zero                       | "Informe o valor da cobrança"                                  |
| Data inválida                    | "Informe uma data válida para a 1ª cobrança"                   |
| Falha ao salvar                  | "Não foi possível salvar a assinatura"                         |
| Falha ao encerrar / excluir      | "Não foi possível encerrar o plano" / "... excluir o plano"    |
| Falha ao carregar                | "Não foi possível carregar as assinaturas e parcelamentos"     |

## Testes

- `src/models/materializacaoPlanos.test.ts`: compra parcelada, assinatura (horizonte, numeração, frequência anual,
  fim previsto, no cartão), cancelamento e salário.
- `src/utils/parcelas.test.ts`: rateio, datas de fim de mês, ocorrências e custo mensal.
- `src/models/transacoesModel.test.ts`, bloco `listCobrancasDePlanos`.

## Observações

- No modo salário, tocar em "Salvar assinatura" sem escolher o caixa não faz nada: o painel retorna antes de chegar à
  validação do hook ("Escolha o caixa que recebe o salário"), que nunca aparece (pendência em Tarefas).
- Não há edição de plano: para mudar valor ou dia, é preciso encerrar e criar outro.
- Excluir um plano no cartão não chama a limpeza de faturas vazias, só o encerrar chama (pendência em Tarefas).
- Sem seta de voltar no header (pendência em Tarefas).
- A categoria e as tags de um plano mudam pelas listas de lançamentos (deslizar uma parcela), não por esta tela.
