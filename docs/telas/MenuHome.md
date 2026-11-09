# Menu

Aba **Menu** · rota `MenuHome` (primeira da pilha `MenuStack`) · pasta `src/views/MenuHome` · título "Menu",
subtítulo "Cadastros, preferências e sistema"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Hub da aba Menu, no estilo da tela de ajustes do celular: leva aos cadastros, às telas financeiras e à integração,
guarda as preferências do app (tema e local padrão de compra) e tem a zona de perigo para recriar o banco.

## Navegação

- **Entrada:** aba Menu. Tocar de novo na aba, com outra tela aberta, volta para cá.
- **Saídas** (todas na pilha Menu, via `navigation.navigate('Menu', { screen })`):

| Grupo        | Item                       | Descrição na linha                                         | Rota |
|--------------|----------------------------|------------------------------------------------------------|------|
| Cadastros    | Categorias de lançamento   | "Mercado, Transporte, Lazer... para ver onde o dinheiro vai" | [`CategoriasLancamento`](CategoriasLancamento.md) |
| Cadastros    | Categorias de produto      | "Agrupe os produtos por tipo"                              | [`Categorias`](Categorias.md) |
| Cadastros    | Marcas                     | "Usadas nas variantes de produto"                          | [`Marcas`](Marcas.md) |
| Cadastros    | Empresas                   | "Mercados e lojas onde você compra"                        | [`Empresas`](Empresas.md) |
| Financeiro   | Assinaturas e parcelas     | "Gastos que se repetem todo mês"                           | [`Planos`](Planos.md) |
| Financeiro   | Contas e cartões           | "Caixas, reservas de investimento e cartões de crédito"    | [`Contas`](Contas.md) |
| Financeiro   | Tags de eventos            | "Viagem, Reforma... quanto custou cada evento"             | [`Tags`](Tags.md) |
| Sistema      | Integração                 | "Backup em JSON, API e perguntas à IA"                     | [`Integracao`](Integracao.md) |
| Zona de perigo | Recriar banco de dados   | "Guarda um backup e apaga todos os dados do app"           | (ação, sem tela) |

A pilha Menu também registra `Faturas` (aberta por Contas) e `BuscaLancamentos` (aberta por Tags).

## Funcionalidades

### Grupos de itens (`MenuGrupo` + `MenuItem`)

Cada grupo tem um título pequeno e as linhas num cartão só, separadas por divisores. Cada linha: ícone num círculo,
rótulo, descrição e a seta; o toque vibra e tem resposta de escala (e o "ripple" no Android). A linha de perigo fica
em vermelho.

### Preferências (`PreferenciasCard`)

- **Aparência:** Sistema, Claro ou Escuro (`SegmentedControl`). Muda o tema na hora e é gravada em `settings` (chave
  `tema`) pelo `App.tsx`. "Sistema" segue o modo do aparelho.
- **Local padrão de compra:** chips com os locais do catálogo fixo (Muriaé, Viçosa). "Usado automaticamente ao
  registrar lançamentos e preços, sem perguntar toda vez." Gravado em `settings` (chave `local_padrao`) ao tocar;
  relido a cada foco da tela.

### Recriar banco de dados

1. Alerta "Recriar banco de dados": "Todos os lançamentos, produtos e cadastros serão apagados. Antes, o app guarda um
   backup automático, que pode ser restaurado em Integração › Importar. Deseja continuar?" (Cancelar / Apagar tudo).
2. `recriarBancoComBackup()`: grava uma cópia do banco em JSON na pasta de backups (motivo `recriar-banco`, no rodízio
   das 5 últimas). **Se a cópia falhar, nada é apagado** e a mensagem diz isso.
3. Com a cópia salva, `recriarDatabase()`: desfaz todas as migrations (cada `down`, da última para a primeira), fecha
   e reabre a conexão e roda as migrations de novo. O banco volta vazio, com as categorias padrão e o caixa padrão.
4. Aviso: "Banco de dados recriado. O backup de antes está em Integração › Importar."
5. Outra falha: "Não foi possível recriar o banco de dados. Feche e abra o app antes de tentar de novo."

## Arquivos

| Arquivo                            | Papel                                                         |
|------------------------------------|---------------------------------------------------------------|
| `index.tsx`                        | Os grupos, as preferências, o local padrão e o recriar banco  |
| `components/MenuGrupo.tsx`         | Seção com título e cartão de linhas                           |
| `components/MenuItem.tsx`          | Linha tocável do menu                                         |
| `components/PreferenciasCard.tsx`  | Aparência e local padrão                                      |

```
MenuNavigationView
├── ScreenHeader
└── ScrollView
    ├── MenuGrupo "Cadastros" → MenuItem × 4
    ├── MenuGrupo "Financeiro" → MenuItem × 3
    ├── PreferenciasCard (SegmentedControl + ChipSelector)
    ├── MenuGrupo "Sistema" → MenuItem
    └── MenuGrupo "Zona de perigo" → MenuItem (perigo)
```

## Lógica

- Não tem hook próprio. A tela guarda só o `localPadrao` (lido com `getLocalPadrao()` a cada foco, gravado com
  `saveLocalPadrao()`).
- O tema vem do `ThemeProvider` (`useTheme().preferencia` e `setPreferencia`); quem grava é o `App.tsx`
  (`saveTemaPreferido`), e a preferência é lida na abertura do app (`getTemaPreferido`).

## Models e tabelas

| Função                                     | Módulo                  | O que toca                                     |
|--------------------------------------------|-------------------------|------------------------------------------------|
| `getLocalPadrao`, `saveLocalPadrao`        | `settingsModel.ts`      | `settings` (`local_padrao`)                    |
| `saveTemaPreferido` (via `App.tsx`)        | `settingsModel.ts`      | `settings` (`tema`)                            |
| `recriarBancoComBackup`                    | `backupAutomatico.ts`   | arquivo em `backups/` + o banco inteiro        |
| `recriarDatabase`, `clearDatabase`         | `database.ts`           | todas as tabelas (via migrations)              |
| `exportarBanco` (dentro do backup)         | `backup.ts`             | lê todas as tabelas                            |

O local padrão é usado por `registrarLancamento` (Home, Lista de compras, Notas) e por `registrarPrecoVariante`
(Lista de compras e Orçamento), e aparece no gráfico "Por localidade" da tela Mês.

## Testes

- `src/models/backupAutomatico.test.ts`, bloco `recriarBancoComBackup`: guarda o banco e recria vazio; sem cópia,
  nada é apagado.
- `src/models/database.test.ts`, bloco "clearDatabase e recriarDatabase".

## Observações

- `src/views/More` ("Mais funcionalidades") não está ligada a este menu nem a nenhuma rota; ver [More](More.md).
- `settingsModel.ts` ainda tem `getMonthlyIncome`/`saveMonthlyIncome` (renda mensal), sem uso em nenhuma tela
  (pendência em Tarefas).
