# Faturas

Aba **Menu** · rota `Faturas` (pilha `MenuStack`) · pasta `src/views/Faturas` · título "Faturas — <nome do cartão>"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Lista os ciclos de fatura de um cartão de crédito, do mais recente para o mais antigo, com o status (aberta, fechada,
paga), as datas de fechamento e vencimento, o total e o que falta pagar. "Pagar" grava o pagamento a partir de um
caixa escolhido. O pagamento não aparece como gasto: o gasto foi a compra, que já contou no mês em que aconteceu.

## Navegação

- **Entrada:** [Contas](Contas.md) › "Ver faturas" no cartão (ou no "..." do cartão inativo), com `{ contaId }`. É o
  único caminho.
- **Parâmetro:** `Faturas: { contaId: string }` (tipado como opcional; sem ele a tela fica vazia).
- **Saída:** só o voltar do sistema: o header não tem a seta de voltar.

## Conceitos

- **Fatura** (`faturas`): um ciclo de fechamento de um cartão (`conta_id` + `mes_ref` 'YYYY-MM', únicos juntos), com
  as datas de fechamento e vencimento.
- Nasce vazia no ato da primeira compra do ciclo (`garantirFatura`), seja à vista, parcela ou cobrança de assinatura no
  cartão, e acumula as compras (`compra_cartao` com `fatura_id`).
- **Ciclo da compra** (`faturaDaCompra`): compra até o dia de fechamento cai na fatura que fecha neste mês; depois do
  fechamento, no ciclo seguinte. O vencimento fica no mesmo mês quando o dia de vencimento é depois do fechamento
  (fecha 10, vence 20); senão, no mês seguinte (fecha 30, vence 10). Dias que não existem no mês são ajustados (31 em
  abril vira 30).
- **Situação calculada pelos valores**, não por uma flag: total = soma das compras do ciclo (negativa); pago = soma dos
  pagamentos (negativa); restante = total − pago, arredondado; **paga** = havia compra e o restante é zero ou crédito.
  Uma compra lançada depois, com data de um ciclo já pago, reabre a fatura, e o pagamento novo cobre só a diferença
  ("(complemento)"). A coluna `faturas.paga` ficou como legado.

## Funcionalidades

### Lista (`FaturaCard`)

- Cada ciclo: mês de referência ("Nov/2026"), "Fecha DD/MM/AAAA · vence DD/MM/AAAA", "Total: R$ X" e, depois de um
  pagamento parcial, "· falta R$ Y".
- Selo de status: **Paga** (verde), **Fechada** (vermelho, fechamento já passou e não está paga) ou **Aberta**.
- "Vencida" em vermelho quando há saldo a pagar e o vencimento já passou.
- Botão **Pagar** quando falta pagar.
- Sem faturas: "Nenhuma fatura ainda: lançe uma compra neste cartão".

### Pagar (`PagarFaturaModal`)

- **Conta pagante:** chips com os caixas ativos; o primeiro já vem escolhido.
- **Data do pagamento:** sugere o vencimento.
- Botão "Pagar R$ X" com o restante.
- Grava e avisa "Fatura paga". Erros do model aparecem com a mensagem dele ("Fatura sem compras: nada a pagar.").

## Arquivos

| Arquivo                           | Papel                                                  |
|-----------------------------------|--------------------------------------------------------|
| `index.tsx`                       | Header com o nome do cartão, lista e painel de pagar   |
| `useFaturas.ts`                   | Carga do cartão, faturas e caixas; pagamento           |
| `components/FaturaCard.tsx`       | Linha do ciclo com status e valores                    |
| `components/PagarFaturaModal.tsx` | Conta pagante e data                                   |

```
FaturasView
├── ScreenHeader "Faturas — <cartão>" (sem voltar)
├── LoadingState | EmptyState | ScrollView → FaturaCard*
└── PagarFaturaModal (BottomSheet: ChipSelector + BrazilianDateInput)
```

## Lógica (`useFaturas`)

- A cada foco: `getContaById(contaId)`, `listFaturas(contaId)` (com total e restante calculados no SQL) e
  `listContasPorTipo('caixa')`.
- `pagar(faturaId, pagante, data)` → `pagarFatura`, numa transação:
  1. Fatura já paga: não faz nada (idempotente).
  2. Restante zero ou positivo: recusa ("Fatura sem compras: nada a pagar.").
  3. Grava uma linha `pagamento_fatura`: valor = restante (negativo), `conta_id` = caixa pagante, `conta_destino_id` =
     o cartão, `fatura_id`, descrição "Pagamento fatura 2026-11 — <cartão>" (com " (complemento)" se já houve
     pagamento).
  4. Marca `faturas.paga = 1` (legado).
- Efeito nos saldos: o caixa pagante cai o valor; a dívida do cartão diminui o mesmo valor. Como `pagamento_fatura`
  fica fora do fluxo de gastos, a tela Mês e a projeção não contam o pagamento.
- Excluir o pagamento na lista de lançamentos reabre a fatura; o "Desfazer" fecha de novo.

## Models e tabelas

| Função                                    | Módulo         | Tabelas                    |
|-------------------------------------------|----------------|----------------------------|
| `listFaturas`, `pagarFatura`, `getFaturaById` | `faturas.ts` | `faturas`, `transacoes`    |
| `getContaById`, `listContasPorTipo`       | `contas.ts`    | `contas`                   |
| `garantirFatura` (na gravação das compras) | `faturas.ts`  | `faturas`                  |
| `apagarFaturasVazias` (ao encerrar plano) | `faturas.ts`   | `faturas`, `transacoes`    |

Utilitários: `faturaDaCompra` e `proximosCiclos` (`utils/cartao.ts`), `formatarData` e `toCurrency`
(`utils/format.ts`).

## Testes

- `src/models/faturas.test.ts`: `garantirFatura` idempotente, compra no ciclo certo e fora do caixa, pagamento em
  transação, idempotência, fatura sem compras, compra retroativa e exclusão do pagamento.
- `src/models/lancamentos.test.ts`: compra parcelada no cartão, uma fatura por ciclo, pagamento de cada ciclo.
- `src/utils/cartao.test.ts`: ciclo da compra, vencimento, virada de ano e ajustes de fim de mês.

## Observações

- Erro de digitação no estado vazio: "lançe" (o certo é "lance"); pendência em Tarefas.
- A data do pagamento não é validada: o campo devolve texto vazio quando a data digitada é inválida, e o pagamento
  seria gravado assim (pendência em Tarefas).
- Uma fatura que ficou sem nenhuma linha (por exemplo, depois de excluir um plano no cartão) continua na lista com
  total zero, até um encerramento de plano rodar a limpeza (`apagarFaturasVazias`); pendência em Tarefas.
- Sem seta de voltar no header (pendência em Tarefas).
- O dia de fechamento e de vencimento vêm do cadastro do cartão em Contas; mudar esses dias não recalcula as faturas
  já criadas.
