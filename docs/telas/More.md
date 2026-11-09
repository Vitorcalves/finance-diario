# Mais funcionalidades (sem rota)

Sem aba · **sem rota** · pasta `src/views/More` · título "Mais funcionalidades"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Placeholder "Em construção" para funcionalidades futuras (categorias, relatórios e metas, diz o texto). Não está em
nenhuma rota de `src/routes/AppRoutes.tsx`, então não há como chegar a ela pelo app.

## O que mostra

- `ScreenHeader` "Mais funcionalidades", sem voltar.
- `EmptyState` com o ícone de construção, a mensagem "Em construcao" e a dica "Esta tela e um placeholder para futuras
  features como categorias, relatorios e metas." (os dois textos estão sem acento).

## Arquivos

| Arquivo      | Papel                              |
|--------------|------------------------------------|
| `index.tsx`  | A tela inteira (header e vazio)    |

## Lógica, models e testes

Nenhum: não tem hook, não acessa o banco e não tem testes.

## Observações

- Pendência registrada em [Tarefas](<../Tarefas — Finance Diário.md>), "Tela órfã": remover a pasta ou ligá-la a uma
  rota.
- As categorias já existem em outras telas; relatórios e metas aparecem nas Tarefas como inflação pessoal (item 5) e
  limite mensal por categoria (item 6).
