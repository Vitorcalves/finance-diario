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
- **Excluir:** confirma ("Deseja excluir "X"?") e avisa "Categoria excluída".
- Não há edição: para renomear, é preciso excluir e criar de novo.
- Categorias também podem ser criadas dentro do formulário de produto ("Nova categoria").
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

- A cada foco: `listCategorias()` (`ORDER BY created_at DESC`).
- `salvar(nome)`: recusa nome vazio e insere com id novo.
- `deletar`: confirmação e `deleteCategoriaById`.

## Models e tabelas

| Função                                              | Módulo           | Tabela        |
|-----------------------------------------------------|------------------|---------------|
| `listCategorias`, `insertCategoria`, `deleteCategoriaById` | `categorias.ts` | `categorias` (migration 001) |

A ligação com os produtos fica em `categoria_produto` (model `categoriasProduto.ts`). Excluir a categoria apaga em
cascata esses vínculos; os produtos continuam.

## Validações e mensagens

| Situação           | Mensagem                                   |
|--------------------|--------------------------------------------|
| Nome vazio         | "Nome da categoria é obrigatório"          |
| Falha ao carregar  | "Não foi possível carregar as categorias"  |
| Falha ao salvar    | "Não foi possível salvar a categoria"      |
| Falha ao excluir   | "Não foi possível excluir a categoria"     |

## Testes

Não há testes específicos deste cadastro.

## Observações

- O título "Categorias" é o mesmo da tela de categorias de lançamento (pendência em Tarefas).
- Sem seta de voltar (pendência em Tarefas) e sem edição, ao contrário de Categorias de lançamento.
- O model não impede nomes repetidos (pendência em Tarefas).
