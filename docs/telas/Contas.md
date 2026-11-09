# Contas

Aba **Menu** · rota `Contas` (pilha `MenuStack`) · pasta `src/views/Contas` · título "Contas", subtítulo "Caixas,
reservas e cartões"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Mostra onde o dinheiro está: os **caixas** (conta corrente, carteira; entram no saldo disponível), as **reservas** de
investimento (dinheiro guardado para um objetivo, com meta opcional) e os **cartões** de crédito (acumulam dívida até a
fatura ser paga). Tem o resumo do saldo, das reservas e do que está em aberto nos cartões, os aportes e resgates das
reservas, o extrato de cada reserva e o acesso às faturas de cada cartão.

## Navegação

- **Entrada:** Menu › Financeiro › Contas e cartões.
- **Saída:** "Ver faturas" de um cartão → [`Faturas`](Faturas.md) com `{ contaId }`. Fora isso, só o voltar do
  sistema: o header tem o "+" mas não a seta de voltar.

## Conceitos

- **Caixa padrão** (`caixa-padrao`): criado pela migration 012 a partir do antigo caixa único. Recebe todo lançamento
  e plano sem conta escolhida, por isso nunca é excluído, inativado nem muda de tipo (pode ser renomeado).
- **Saldo** = saldo inicial + o efeito de cada transação na conta:
  - na origem (`conta_id`) soma o valor (gasto negativo, entrada positiva, compra no cartão negativa);
  - no destino (`conta_destino_id`, só em transferência e pagamento de fatura) subtrai o valor (a mesma linha com o
    sinal invertido);
  - o registro da compra parcelada (parcela 0) não pesa em lugar nenhum.
- **Data de corte:** caixa e reserva contam só o que já aconteceu (data até hoje); no cartão a dívida nasce na compra,
  então as parcelas futuras já contam.
- **Tipo travado:** depois que a conta tem algum lançamento, o tipo não muda (compra no cartão tem fatura; no caixa,
  não).

## Funcionalidades

### Resumo (`ResumoContas`)

Até três quadros, só com contas ativas:

- **Saldo atual** (soma dos caixas, o mesmo número da Home), com "N caixas"; vermelho se negativo.
- **Reservas** (soma das reservas), com "N reservas"; só aparece com reserva.
- **Cartões** "em aberto" (soma das dívidas); só aparece com cartão.

### Seções e cartões (`ContaCard`)

- Seções na ordem **Caixas**, **Reservas**, **Cartões** e **Inativas** (de qualquer tipo); seção vazia some.
- Cada cartão: selo do tipo na cor da conta (`ContaIcone`), nome, linha de apoio ("Conta padrão", "Meta de R$ 5.000",
  "Sem meta definida", "Fecha dia 30 · vence dia 10"; nas inativas, o tipo vem na frente) e o "...".
- Número principal (`valorDaConta`): "Saldo" no caixa e na reserva (vermelho se negativo); no cartão, "Em aberto"
  (a dívida, positiva) ou "Crédito" (pago a mais).
- Reserva com meta: barra de progresso e "62% da meta · faltam R$ 1.900" ou "Meta atingida". O percentual é
  arredondado para baixo, então só mostra 100% quando a meta chega.
- Botões do dia a dia: **Aportar** e **Resgatar** (reserva ativa, se há caixa ativo) e **Ver faturas** (cartão ativo).
- Conta inativa aparece apagada.

### Menu "..." (`MenuAcoes`)

Título com o nome e o subtítulo "Saldo: R$ X" (ou "Em aberto"/"Crédito"). Ações, conforme a conta:

- **Ver extrato** (reserva).
- **Ver faturas** (cartão inativo; o ativo tem o botão no cartão).
- **Editar conta.**
- **Reativar conta** (inativa).
- **Excluir conta** (sem lançamentos) ou **Inativar conta** (com lançamentos e ativa). O caixa padrão não tem nenhuma
  das duas.

### Nova / editar conta (`ContaFormModal`)

- Prévia com o selo e o nome.
- **Nome da conta \*** ("Ex.: Conta corrente, Reserva de emergência").
- **Tipo:** Caixa, Reserva ou Cartão. Travado (vira um texto explicativo) no caixa padrão e em conta com lançamentos.
- **Cartão:** Dia de fechamento \* e Dia de vencimento \* (1 a 31).
- **Reserva:** Meta de acumulação (opcional).
- **Caixa e reserva:** Saldo inicial ("Quanto já havia na conta antes do primeiro lançamento no app.").
- **Cor:** a paleta do app; sem escolha, vale a do tipo (caixa aqua, reserva azul, cartão violeta). Contas antigas com
  cor em hex continuam valendo.

### Aportar e resgatar (`TransferenciaReservaModal`)

- "Aportar em X" (dinheiro do caixa para a reserva) ou "Resgatar de X" (de volta ao caixa).
- Valor \*, caixa (o primeiro ativo já vem escolhido), data e descrição opcional ("Aporte — X" / "Resgate — X" se
  vazia).
- Prévia "Saldo do caixa após: R$ X" (ou "da reserva"), com "— ficará negativo" quando for o caso. Não impede: o
  resgate sem saldo é permitido e deixa a conta negativa.
- Grava uma transferência e avisa "Aporte registrado" / "Resgate registrado".

### Extrato da reserva (`ReservaDetalheModal`)

- Saldo atual, meta com barra e "Faltam R$ X" (ou "Sem meta definida"), "Aportado neste mês: R$ X".
- "Aportes e resgates": os últimos 100 movimentos que tocaram a reserva em qualquer ponta, com seta verde (entrada)
  ou vermelha (saída), descrição, data e valor.
- Vazio: "Nenhum aporte ou resgate ainda. Use Aportar ou Resgatar no card da reserva."

### Excluir ou inativar

- Antes de perguntar, a tela conta as transações da conta.
- **Com lançamentos:** "X tem lançamentos e não pode ser excluída. Inativar remove a conta dos seletores, mas mantém o
  histórico." → "Conta inativada". A conta sai dos chips do formulário de lançamento e dos totais, mas a Busca
  continua achando os lançamentos dela.
- **Sem lançamentos:** "Deseja excluir "X"?" → "Conta excluída" (as faturas vazias de um cartão saem junto).
- **Caixa padrão:** "O caixa padrão recebe os lançamentos sem conta e não pode ser excluído nem inativado."

## Arquivos

| Arquivo                                   | Papel                                                         |
|-------------------------------------------|---------------------------------------------------------------|
| `index.tsx`                               | Resumo, seções, menu de ações, formulário, aporte e extrato   |
| `useContas.ts`                            | Carga com saldo, salvar, remover/inativar, reativar, transferir e extrato |
| `components/ResumoContas.tsx`             | Quadros do topo                                               |
| `components/ContaCard.tsx`                | Cartão da conta com valor, meta e ações                       |
| `components/ContaFormModal.tsx`           | Cadastro e edição                                             |
| `components/TransferenciaReservaModal.tsx`| Aporte e resgate                                              |
| `components/ReservaDetalheModal.tsx`      | Saldo, meta e extrato da reserva                              |

Usa `src/components/ContaIcone.tsx` e `src/components/SeletorCor.tsx`, e as funções puras de `src/utils/contas.ts`.

```
ContasView
├── ScreenHeader (+, sem voltar)
├── LoadingState | EmptyState | ScrollView
│   ├── ResumoContas
│   └── seção* → ContaCard* (BarraProgresso, botões)
├── MenuAcoes
├── ContaFormModal (BottomSheet)
├── TransferenciaReservaModal (BottomSheet)
└── ReservaDetalheModal (BottomSheet)
```

## Lógica (`useContas`)

- A cada foco: `listContasComSaldo()` (saldo calculado no banco, para hoje, e `possui_lancamentos`).
- Derivados: `secoes = agruparContas(contas)`, `totais = somarPorTipo(contas)` (só ativas), `caixas` (caixas ativos,
  parceiros do aporte/resgate) e a quantidade de contas ativas de cada tipo.
- `salvar(dados, editando)`: `normalizarDadosConta` (nome obrigatório; dias só no cartão e obrigatórios nele, entre 1
  e 31; meta só na reserva e só se positiva; saldo inicial padrão 0); `updateConta` (recusa mudar o tipo de conta com
  lançamentos e mexer no tipo/ativo do caixa padrão) ou `insertConta` (ordem = quantidade de contas).
- `remover(conta)`: `contarTransacoesDaConta` → `inativarConta` ou `deleteContaById`.
- `reativar(conta)`: `reativarConta`.
- `transferir(dados)`: valida valor e data e chama `registrarLancamento` com `contaId` (origem) e `contaDestinoId`
  (destino): aporte = caixa → reserva; resgate = reserva → caixa. Uma linha só, natureza `transferencia`, valor
  negativo.
- `abrirDetalhe(reserva)`: `listMovimentosDaConta(reserva.id)` (100 mais recentes) e `totalAportadoNoMes` (soma das
  transferências que chegaram nela no mês).

## Models e tabelas

| Função                                                         | Módulo           | Tabelas                    |
|----------------------------------------------------------------|------------------|----------------------------|
| `listContasComSaldo`, `somarPorTipo`                           | `contas.ts`      | `contas`, `transacoes`     |
| `normalizarDadosConta`, `insertConta`, `updateConta`, `podeMudarTipo`, `podeRemoverConta` | `contas.ts` | `contas`  |
| `contarTransacoesDaConta`, `inativarConta`, `reativarConta`, `deleteContaById` | `contas.ts` | `contas`, `transacoes`, `faturas` |
| `listMovimentosDaConta`, `totalAportadoNoMes`                  | `contas.ts`      | `transacoes`               |
| `registrarLancamento` (transferência)                          | `lancamentos.ts` | `transacoes`               |

Colunas de `contas`: `nome`, `tipo` (`caixa`/`reserva`/`cartao`), `dia_fechamento`, `dia_vencimento`, `meta_valor`,
`saldo_inicial`, `cor` (chave da paleta ou hex antigo), `ativo`, `ordem`.

Utilitários (`src/utils/contas.ts`): `valorDaConta`, `descreverConta`, `progressoDaMeta`, `corDaConta`,
`agruparContas` e `COR_PADRAO_TIPO_CONTA`.

## Validações e mensagens

| Situação                                   | Mensagem                                                                 |
|--------------------------------------------|--------------------------------------------------------------------------|
| Nome vazio                                 | "Nome da conta é obrigatório."                                           |
| Cartão sem os dias                         | "Cartão precisa do dia de fechamento e do dia de vencimento."            |
| Dia fora de 1–31                           | "Dia de fechamento deve ser um inteiro entre 1 e 31." (ou vencimento)    |
| Mudar tipo de conta com lançamentos        | "Esta conta já tem lançamentos, então o tipo dela não pode mudar."       |
| Mexer no tipo/ativo do caixa padrão        | "O caixa padrão recebe os lançamentos sem conta: ele não pode ser excluído, inativado nem mudar de tipo." |
| Aporte/resgate sem valor ou data           | "Informe um valor maior que zero." / "Informe uma data válida."          |
| Falhas                                     | "Não foi possível salvar a conta", "... registrar a transferência", "... carregar o detalhe da reserva" etc. |

As mensagens de regra aparecem com o título "Confira a conta".

## Testes

- `src/models/contas.test.ts`: CRUD, validações, saldo (à vista, aporte, resgate, cartão, parcelado, sem limite),
  saldo na data, totais, proteção do caixa padrão e do tipo.
- `src/models/transferencias.test.ts`: aporte, resgate, sinal, saldo negativo permitido, origem igual ao destino e
  destino inexistente.
- `src/utils/contas.test.ts`: progresso da meta, valor, descrição, seções e cor.
- `src/models/naturezaTransacao.test.ts`, bloco `garantirCaixaPadrao`.

## Observações

- A transferência daqui grava o local fixo `Locais.padrao` (Muriaé), e não o local padrão escolhido no Menu; para
  transferência isso não muda nenhum número.
- A ordem das contas é a de criação; não há reordenação na tela.
- Sem seta de voltar no header (pendência em Tarefas).
