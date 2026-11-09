# Análises (hub)

Aba **Análises** · rota `DashboardHome` (primeira da pilha `DashboardStack`) · pasta `src/views/Dashboard` · título
"Análises", subtítulo "Preços, comparações e pesquisa de mercado"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Porta de entrada da aba Análises: três cartões que levam às telas de consulta e comparação de preços. Não lê nada do
banco.

## Navegação

- **Entrada:** aba Análises. Quando a Home abre o Orçamento direto (`initial: false`), este hub fica embaixo dele na
  pilha, e o voltar do Orçamento traz para cá.
- **Saídas** (mesma pilha):

| Cartão              | Descrição no cartão                                                              | Rota              |
|---------------------|----------------------------------------------------------------------------------|-------------------|
| Análise de preços   | "Quanto você pagou por produto ao longo do tempo, contra o histórico de preços." | [`AnalisePrecos`](AnalisePrecos.md) |
| Histórico de preços | "Compare o preço de cada variante entre mercados e encontre o mais barato."      | [`HistoricoPrecos`](HistoricoPrecos.md) |
| Orçamento           | "Pesquise preços na gôndola e veja em qual mercado a lista sai mais barata."     | [`Orcamento`](Orcamento.md) |

- Tocar de novo na aba Análises, com uma análise aberta, volta para este hub. Trocar de aba mantém a análise aberta (o
  usuário costuma deixar uma aberta e comparar com outra aba).

## Funcionalidades

- Cada cartão (`AnaliseCard`) tem um selo com ícone (tendência, etiquetas, carrinho) no tom da análise (marca, azul de
  informação ou amarelo de aviso), título, descrição e a seta. O toque vibra e tem resposta de escala.
- Os cartões entram em sequência, com 60 ms de atraso entre eles (`Aparecer`).

## Arquivos

| Arquivo                       | Papel                                         |
|-------------------------------|-----------------------------------------------|
| `index.tsx`                   | Header e os três cartões                      |
| `components/AnaliseCard.tsx`  | Cartão de atalho com ícone, título e descrição |

```
DashboardHomeView
├── ScreenHeader
└── ScrollView → Aparecer → AnaliseCard × 3
```

## Lógica, models e testes

Não tem hook, não acessa o banco e não tem testes próprios.

## Observações

- A pasta se chama `Dashboard` (nome antigo da aba); a rota da aba no navegador também é `Dashboard`, mas o rótulo
  na barra inferior é "Análises".
