# Marcas

Aba **Menu** · rota `Marcas` (pilha `MenuStack`) · pasta `src/views/Marcas` · título "Marcas"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Cadastro das marcas usadas nas variantes de produto ("Camil", "Tio João"...). A marca entra no rótulo de toda variante
("Camil • 5 Quilogramas") no lançamento, na lista de compras, no orçamento e nas análises de preço.

## Navegação

- **Entrada:** Menu › Cadastros › Marcas.
- **Saída:** só o voltar do sistema: o header não tem a seta de voltar.

## Funcionalidades

- Lista de cartões com o nome e os botões editar e excluir. Da mais nova para a mais antiga.
- "+" do header (ou "Adicionar Marca" no estado vazio) abre o painel "Nova marca" (`MarcaFormModal`): "Nome da marca
  \*" (placeholder "Ex.: Camil"), com o teclado aberto na criação; confirmar no teclado salva.
- O lápis abre o mesmo painel como "Editar marca".
- **Excluir:** confirma ("Deseja excluir "X"? Ela sai do cadastro e do seletor de marca. As variantes que já a usam
  continuam com ela.") e avisa "Marca excluída".
- Marcas também podem ser criadas dentro do formulário de variante ("Nova marca").
- **Nome único:** criar ou renomear para o nome de outra marca ativa é recusado com o alerta "Nome repetido" ("Já
  existe a marca "Camil"."), sem diferenciar maiúsculas, acentos nem espaços sobrando; o painel continua aberto.
- Avisos: "Marca adicionada" / "Marca atualizada".

## Arquivos

| Arquivo                         | Papel                                     |
|---------------------------------|-------------------------------------------|
| `index.tsx`                     | Header, lista e painel                    |
| `useMarcas.ts`                  | Carga, salvar (criar ou editar) e excluir |
| `components/MarcaFormModal.tsx` | Painel com o campo de nome                |

```
MarcasView
├── ScreenHeader (+, sem voltar)
├── LoadingState | EmptyState | ScrollView → cartões (nome, editar, excluir)
└── MarcaFormModal (BottomSheet sem rolagem)
```

## Lógica (`useMarcas`)

- A cada foco: `listMarcas()` (só as ativas, `ORDER BY created_at DESC`).
- `salvar(nome, editando)`: recusa nome vazio; `updateMarca` ou `insertMarca` (o id é `AUTOINCREMENT`, um inteiro, ao
  contrário dos outros cadastros, que usam UUID). O `NomeRepetidoError` do model vira o alerta "Nome repetido".
- `deletar`: confirmação e `deleteMarcaById`.

## Models e tabelas

| Função                                                         | Módulo      | Tabela   |
|----------------------------------------------------------------|-------------|----------|
| `listMarcas`, `insertMarca`, `updateMarca`, `deleteMarcaById`  | `marcas.ts` | `marcas` (migrations 001 e 020) |
| `exigirNomeLivre`, `NomeRepetidoError`                         | `nomeRepetido.ts` | — |

### Nome único

`insertMarca` e `updateMarca` leem as marcas ativas e chamam `exigirNomeLivre` antes de gravar (regra geral em
[Base comum](README.md), seção "Nome único nos cadastros"). Só as ativas contam: o nome de uma marca excluída pode ser
usado de novo, numa linha nova. Na edição, a marca não é repetida de si mesma ("Camil" pode virar "CAMIL").

### O que a exclusão faz

A exclusão é **lógica** (migration 020; regra geral em [Base comum](README.md), seção "Exclusão lógica dos
cadastros"): `deleteMarcaById` não apaga a linha, grava a data em `marcas.deleted_at`. A marca some deste cadastro e
do seletor de marca do formulário de variante, mas as variantes que já a usam **continuam com ela**
(`produto_variantes.marca_id` não muda): o rótulo "Camil • 5 Quilogramas" segue igual no lançamento, na Lista de
compras, no Orçamento e nas análises. Por isso essas telas leem as marcas com `listMarcas({ comExcluidos: true })`.

Para tirar a marca de uma variante, edite a variante no [formulário de produto](ProdutoForm.md): a marca excluída
aparece no seletor como "(excluída)" e pode ser trocada. Não há tela para desfazer a exclusão.

## Validações e mensagens

| Situação           | Mensagem                               |
|--------------------|----------------------------------------|
| Nome vazio         | "Nome da marca é obrigatório"          |
| Nome repetido      | "Já existe a marca "X"." (alerta "Nome repetido") |
| Falha ao carregar  | "Não foi possível carregar as marcas"  |
| Falha ao salvar    | "Não foi possível salvar a marca"      |
| Falha ao excluir   | "Não foi possível excluir a marca"     |

## Testes

- `src/models/exclusaoLogica.test.ts`: a marca excluída sai do cadastro, fica no banco com a data e a variante que a
  usava continua com ela.
- `src/models/nomeRepetido.test.ts`: nome repetido recusado (maiúsculas, acentos, espaços), nome de marca excluída
  liberado e edição aceitando o próprio nome e recusando o de outra.

## Observações

- Duas marcas "Camil" criadas antes da regra do nome único continuam no cadastro, com as variantes divididas entre
  elas: não há migration que junte. Renomeie ou exclua uma das duas.
- O formulário de variante acha a marca recém-criada pelo nome, entre as ativas; com o nome único, só existe uma.
- Uma marca excluída continua no banco: criar outra com o mesmo nome gera uma linha nova, e as variantes antigas
  seguem apontando para a excluída.
- Sem seta de voltar no header, como Categorias de produto e Empresas (pendência em Tarefas).
