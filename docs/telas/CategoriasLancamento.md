# Categorias de lançamento

Aba **Menu** · rota `CategoriasLancamento` (pilha `MenuStack`) · pasta `src/views/CategoriasLancamento` · título
"Categorias", subtítulo "Dos lançamentos · toque para editar"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Cadastro das categorias que classificam os lançamentos (Mercado, Transporte, Lazer, Salário...), separadas em saídas e
entradas. Cada categoria tem nome, tipo, cor e ícone. São elas que aparecem no formulário de lançamento, no deslizar
"Categoria" das listas, no filtro da Busca e no gráfico "Por categoria" da tela Mês.

Não confundir com as [categorias de produto](Categorias.md), que classificam o que foi comprado.

## Navegação

- **Entrada:** Menu › Cadastros › Categorias de lançamento.
- **Saída:** voltar do header.

## Funcionalidades

- Duas seções, **Saídas** e **Entradas**, cada uma num cartão com as linhas da categoria: ícone na cor dela, nome e a
  lixeira. Tocar na linha abre a edição.
- "+" do header (ou "Criar categoria" no estado vazio) abre o painel de nova categoria.
- **Painel** (`CategoriaLancamentoForm`, "Nova categoria" / "Editar categoria"):
  - Prévia no topo: o ícone na cor escolhida e o nome digitado.
  - **Nome \*** (placeholder "Ex.: Pet").
  - **Tipo:** Saída ou Entrada.
  - **Cor:** grade com a paleta do app (`SeletorCor`): azul, laranja, aqua, amarelo, magenta, verde, violeta,
    vermelho e cinza. As oito primeiras são validadas para daltonismo nos dois temas; cinza é o neutro de "Outros".
  - **Ícone:** grade com 30 ícones (carrinho, restaurante, carro, ônibus, avião, casa, luz, água, wi-fi, saúde, pet,
    escola, jogo, presente, roupa, dinheiro, maleta...); o escolhido ganha a borda na cor da categoria.
  - Nova categoria começa como saída, azul, com o ícone de etiqueta.
- **Excluir:** confirma ("Excluir "X"? Os lançamentos dela ficam sem categoria.") e avisa ""X" excluída".
- Avisos: "Categoria criada" / "Categoria atualizada".

## Arquivos

| Arquivo                                   | Papel                                                  |
|-------------------------------------------|--------------------------------------------------------|
| `index.tsx`                               | Seções Saídas/Entradas, abrir painel e excluir         |
| `useCategoriasLancamento.ts`              | Carga, salvar (criar ou editar) e excluir              |
| `components/CategoriaLancamentoForm.tsx`  | Painel com prévia, nome, tipo, cor e ícone             |

Usa `src/components/CategoriaIcone.tsx` (círculo com o ícone sobre um fundo claro da cor) e
`src/components/SeletorCor.tsx`.

```
CategoriasLancamentoView
├── ScreenHeader (voltar, +)
├── LoadingState | EmptyState | ScrollView
│   ├── seção "Saídas": linhas (CategoriaIcone, nome, lixeira)
│   └── seção "Entradas": linhas
└── CategoriaLancamentoForm (BottomSheet: SegmentedControl, SeletorCor, grade de ícones)
```

## Lógica (`useCategoriasLancamento`)

- A cada foco: `listCategoriasLancamento()` (ordem: tipo — saídas antes das entradas —, `ordem` e nome).
- `salvar(dados, editando)`: recusa nome vazio; edita com `updateCategoriaLancamento` (nome, ícone, cor e tipo) ou
  cria com `insertCategoriaLancamento` (id novo; a `ordem` é a próxima do mesmo tipo, então a nova entra no fim da
  seção).
- `excluir`: confirmação e `deleteCategoriaLancamento`.

## Models e tabelas

| Função                                                     | Módulo                     | Tabela                  |
|------------------------------------------------------------|----------------------------|-------------------------|
| `listCategoriasLancamento`, `insertCategoriaLancamento`, `updateCategoriaLancamento`, `deleteCategoriaLancamento` | `categoriasLancamento.ts` | `categorias_lancamento` (migration 008) |

- Colunas: `id`, `nome`, `icone` (nome do Ionicons), `cor` (chave da paleta), `tipo` (`saida`/`entrada`), `ordem`,
  `created_at`.
- **Categorias padrão** (migration 008, ids fixos para o backup restaurado em outro aparelho apontar para as mesmas):
  Mercado, Restaurantes e delivery, Transporte, Moradia, Contas da casa, Saúde, Lazer, Educação, Assinaturas, Compras,
  Outros (saídas); Salário, Renda extra, Outras entradas (entradas). São recriadas se faltarem ao importar um backup
  antigo (`semearCategoriasLancamento`).
- Excluir a categoria deixa `transacoes.categoria_id` e `planos_pagamento.categoria_id` como `NULL` ("Sem categoria"),
  por `ON DELETE SET NULL`.
- A Lista de compras sugere a categoria de id `mercado` ao fechar a compra; se ela foi excluída, o lançamento sai sem
  categoria.

## Validações e mensagens

| Situação           | Mensagem                                    |
|--------------------|---------------------------------------------|
| Nome vazio         | "Nome da categoria é obrigatório"           |
| Falha ao carregar  | "Não foi possível carregar as categorias"   |
| Falha ao salvar    | "Não foi possível salvar a categoria"       |
| Falha ao excluir   | "Não foi possível excluir a categoria"      |

## Testes

`src/models/categoriasLancamento.test.ts`: categorias padrão, ordem do tipo, exclusão sem apagar lançamentos,
categoria no plano inteiro e a sugestão por empresa.

## Observações

- Trocar o tipo de uma categoria já usada não muda os lançamentos: uma categoria de saída que vira entrada continua
  presa aos gastos antigos (o painel de categoria da lista filtra pelo tipo do lançamento).
- O título é "Categorias", o mesmo das categorias de produto; só o subtítulo diferencia (pendência em Tarefas).
- Não há reordenação manual: a ordem é a de criação dentro de cada tipo.
