# Tags

Aba **Menu** · rota `Tags` (pilha `MenuStack`) · pasta `src/views/Tags` · título "Tags", subtítulo "Quanto custou
cada evento"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Lista as tags de evento ("Viagem julho", "Reforma") com quanto cada evento custou, somando todas as categorias: é o
que a categoria não responde. Cada cartão mostra o gasto, as entradas (reembolso, venda), quanto ainda vai vencer em
parcelas, a quantidade de lançamentos e o período do evento. Tocar no cartão abre os lançamentos da tag.

## Navegação

- **Entrada:** Menu › Financeiro › Tags de eventos.
- **Saída:** tocar no cartão → [`BuscaLancamentos`](BuscaLancamentos.md) com `{ tagId }`, registrada também na pilha
  Menu: a busca abre sem trocar de aba, e o voltar traz para cá (com os totais recarregados).
- Voltar do header.

## Funcionalidades

### Cartão da tag (`TagCard`)

- Ícone de marcador, nome, anotação (até 2 linhas), lápis (editar) e lixeira (excluir).
- **Gasto** (soma das saídas, em vermelho) e, se houver, **Entradas** ("+R$ X", em verde).
- "R$ X em parcelas ainda a vencer", quando há parcelas futuras: o gasto já foi feito e entra no total.
- Rodapé: "N lançamentos · 03/07/26 a 18/07/26" (ou o dia único, "05/07/26"; ou "Julho de 2026" quando o período é o
  mês inteiro) e "Ver lançamentos".
- Tag sem lançamento: o cartão não abre a busca e mostra a dica "Nenhum lançamento ainda. Marque a tag no formulário
  do lançamento ou arraste um lançamento da lista para o lado."
- Ordem: evento mais recente primeiro (pela última data do evento; tag vazia entra pela data de criação), depois pelo
  nome.

### Criar e editar (`TagFormModal`)

- "+" do header (ou "Criar tag" no estado vazio) e o lápis abrem o painel "Nova tag" / "Editar tag".
- **Nome \*** (até 40 caracteres) e **Anotação** opcional ("Ex.: Salvador, 3 a 18 de julho").
- Avisos: "Tag criada" / "Tag atualizada". Regras recusadas aparecem em "Confira a tag".

### Excluir

"Excluir "X"? N lançamentos continuam, só sem a tag." (ou "Nenhum lançamento usa esta tag.") → ""X" excluída". Os
lançamentos não são apagados.

### Onde a tag é marcada (outras telas)

- No [formulário de lançamento](Home.md) (campo Tags, com "Nova tag").
- Deslizando o lançamento na Home ou na Busca (ação "Tags"), só em gasto e entrada.
- Parcela e assinatura levam as tags para o plano inteiro, e as cobranças novas da assinatura herdam as tags.
- Transferência e pagamento de fatura não recebem tags.

## Arquivos

| Arquivo                         | Papel                                            |
|---------------------------------|--------------------------------------------------|
| `index.tsx`                     | Header, lista de cartões, painel e navegação     |
| `useTags.ts`                    | Carga dos resumos, salvar e excluir              |
| `components/TagCard.tsx`        | Cartão com totais, período e ações               |
| `components/TagFormModal.tsx`   | Painel de nome e anotação                        |

```
TagsView
├── ScreenHeader (voltar, +)
├── LoadingState | EmptyState | ScrollView → TagCard*
└── TagFormModal (BottomSheet)
```

## Lógica (`useTags`)

- A cada foco: `listResumoTags(hoje)`. Voltar da busca já mostra as tags marcadas por lá.
- `salvar(dados, editando)` → `salvarTag({ id, nome, descricao })`.
- `excluir(tag)` → confirmação e `deleteTag(id)` (apaga as ligações e a tag numa transação).

### O resumo (`listResumoTags`, em `src/models/tags.ts`)

Uma consulta agrupada por tag (`tags` ⟕ `transacoes_tags` ⟕ `transacoes`):

- **Entram nas somas** só gasto e entrada (`movimento` e `compra_cartao`). O registro da compra parcelada repetiria o
  valor das parcelas, e transferência só muda o dinheiro de lugar.
- **quantidade:** lançamentos de gasto e entrada com a tag; parcela conta uma a uma, como na busca.
- **gastos / entradas:** somas positivas das saídas e das entradas.
- **aVencer:** parte dos gastos com data depois de hoje.
- **início / fim do evento:** menor e maior data entre os lançamentos sem plano, o registro da compra (parcela 0) e a
  1ª cobrança de cada plano. Assim um parcelamento em 10x não estica a viagem de julho até abril.

### Regras da tag (`salvarTag`)

- Espaços repetidos são juntados e os das pontas, tirados (nome e anotação).
- Nome obrigatório, até 40 caracteres e **único sem diferenciar maiúsculas nem acentos**: "Viagem Julho" e "viagem
  julho" seriam o mesmo evento dividido em dois totais.
- Editar uma tag que foi apagada nesse meio-tempo avisa "Essa tag não existe mais.".

## Models e tabelas

| Função                                                        | Módulo     | Tabelas                                   |
|---------------------------------------------------------------|------------|-------------------------------------------|
| `listResumoTags`, `salvarTag`, `deleteTag`                    | `tags.ts`  | `tags`, `transacoes_tags`, `transacoes`   |
| `definirTagsTransacao`, `listTagsPorTransacao`, `herdarTagsDoPlano`, `restaurarTagsTransacao` (outras telas) | `tags.ts` | `transacoes_tags`, `transacoes` |

- `tags` (`id`, `nome`, `descricao`, `created_at`) e `transacoes_tags` (`id`, `transacao_id`, `tag_id`, `created_at`)
  existem desde a migration 001. A migration 018 apagou ligações repetidas e criou o índice único
  (`transacao_id`, `tag_id`) e o índice por `tag_id`.
- Apagar um lançamento apaga as ligações dele (`ON DELETE CASCADE`); o "Desfazer" as devolve.

## Validações e mensagens

| Situação                        | Mensagem                                          |
|---------------------------------|---------------------------------------------------|
| Nome vazio                      | "Informe o nome da tag."                          |
| Nome com mais de 40 caracteres  | "O nome da tag pode ter até 40 caracteres."       |
| Nome repetido                   | "Já existe a tag "X"."                            |
| Tag apagada durante a edição    | "Essa tag não existe mais."                       |
| Falhas                          | "Não foi possível carregar/salvar/excluir a tag"  |

## Testes

`src/models/tags.test.ts`: `salvarTag` (espaços, vazio, longo, repetido, edição), tags no lançamento (à vista,
parcelada, transferência, tag apagada), `definirTagsTransacao` (plano inteiro, herança na assinatura), `listResumoTags`
(somas, tag vazia, ordem), excluir e restaurar, busca por tag e a migration 018.

## Observações

- O campo de nome já corta em 40 caracteres (`maxLength`), então a mensagem de nome longo só aparece por outros
  caminhos (o formulário de lançamento e o painel de tags da lista não limitam o campo).
