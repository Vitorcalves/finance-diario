# Categorias de produto

Aba **Menu** · rota `Categorias` (pilha `MenuStack`) · pasta `src/views/Categorias` · título "Categorias", subtítulo
"N categorias cadastradas"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Cadastro simples das categorias de produto ("Alimentação", "Limpeza"...), que agrupam os produtos por tipo. Elas
aparecem como chips no cartão do produto e são marcadas no [formulário de produto](ProdutoForm.md). Não são as
categorias de lançamento.

## Navegação

- **Entrada:** Menu › Cadastros › Categorias de produto.
- **Saída:** só o voltar do sistema (botão ou gesto do Android): o header desta tela não tem a seta de voltar.

## Funcionalidades

- Lista de cartões (`CategoriaCard`): ícone de etiqueta, nome e a lixeira. Da mais nova para a mais antiga.
- "+" do header (ou "Adicionar Categoria" no estado vazio) abre o painel "Nova categoria" (`CategoriaFormModal`) com
  um campo "Nome da categoria \*" (placeholder "Ex.: Alimentação"), que já abre com o teclado; confirmar no teclado
  também salva.
- **Excluir:** confirma ("Deseja excluir "X"? Ela sai do cadastro e dos produtos em que está marcada. Os produtos
  continuam.") e avisa "Categoria excluída".
- Não há edição: para renomear, é preciso excluir e criar de novo.
- Categorias também podem ser criadas dentro do formulário de produto ("Nova categoria").
- **Nome único:** criar uma categoria com o nome de outra ativa é recusado com o alerta "Nome repetido" ("Já existe a
  categoria "Limpeza"."), sem diferenciar maiúsculas, acentos nem espaços sobrando; o painel continua aberto.
- Avisos: "Categoria adicionada".

## Arquivos

| Arquivo                             | Papel                                   |
|-------------------------------------|-----------------------------------------|
| `index.tsx`                         | Header, lista e painel                  |
| `useCategorias.ts`                  | Carga, criar e excluir                  |
| `components/CategoriaCard.tsx`      | Cartão com nome e lixeira               |
| `components/CategoriaFormModal.tsx` | Painel com o campo de nome              |

```
CategoriasView
├── ScreenHeader (+, sem voltar)
├── LoadingState | EmptyState | ScrollView → CategoriaCard*
└── CategoriaFormModal (BottomSheet sem rolagem)
```

## Lógica (`useCategorias`)

- A cada foco: `listCategorias()` (só as ativas, `ORDER BY created_at DESC`).
- `salvar(nome)`: recusa nome vazio e insere com id novo. O `NomeRepetidoError` do model vira o alerta "Nome
  repetido".
- `deletar`: confirmação e `deleteCategoriaById`.

## Models e tabelas

| Função                                              | Módulo           | Tabela        |
|-----------------------------------------------------|------------------|---------------|
| `listCategorias`, `insertCategoria`, `deleteCategoriaById` | `categorias.ts` | `categorias` (migrations 001 e 020) |
| `exigirNomeLivre`, `NomeRepetidoError`              | `nomeRepetido.ts` | —           |

A ligação com os produtos fica em `categoria_produto` (model `categoriasProduto.ts`).

### Nome único

`insertCategoria` lê as categorias ativas e chama `exigirNomeLivre` antes de gravar (regra geral em
[Base comum](README.md), seção "Nome único nos cadastros"). Só as ativas contam: o nome de uma categoria excluída pode
ser usado de novo, numa linha nova, sem os produtos da antiga.

### O que a exclusão faz

A exclusão é **lógica** (migration 020; regra geral em [Base comum](README.md), seção "Exclusão lógica dos
cadastros"): `deleteCategoriaById` não apaga a linha, grava a data em `categorias.deleted_at`. Os vínculos em
`categoria_produto` também ficam no banco, mas o `listCategorias` de `categoriasProduto.ts` só devolve os de categoria
ativa. Na prática a categoria some deste cadastro, do cartão dos produtos e do formulário de produto; os produtos
continuam. Não há tela para desfazer a exclusão.

## Validações e mensagens

| Situação           | Mensagem                                   |
|--------------------|--------------------------------------------|
| Nome vazio         | "Nome da categoria é obrigatório"          |
| Nome repetido      | "Já existe a categoria "X"." (alerta "Nome repetido") |
| Falha ao carregar  | "Não foi possível carregar as categorias"  |
| Falha ao salvar    | "Não foi possível salvar a categoria"      |
| Falha ao excluir   | "Não foi possível excluir a categoria"     |

## Testes

- `src/models/exclusaoLogica.test.ts`: a categoria excluída some do cadastro e dos produtos, sem apagar a linha nem o
  vínculo.
- `src/models/nomeRepetido.test.ts`: nome repetido recusado e nome de categoria excluída liberado.

## Observações

- O título "Categorias" é o mesmo da tela de categorias de lançamento (pendência em Tarefas).
- Sem seta de voltar (pendência em Tarefas) e sem edição, ao contrário de Categorias de lançamento.
- Categorias de mesmo nome criadas antes da regra do nome único continuam no cadastro: não há migration que junte.
  Como não há edição, exclua uma das duas.
