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
- **Excluir:** confirma ("Deseja excluir "X"?") e avisa "Marca excluída".
- Marcas também podem ser criadas dentro do formulário de variante ("Nova marca").
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

- A cada foco: `listMarcas()` (`ORDER BY created_at DESC`).
- `salvar(nome, editando)`: recusa nome vazio; `updateMarca` ou `insertMarca` (o id é `AUTOINCREMENT`, um inteiro, ao
  contrário dos outros cadastros, que usam UUID).
- `deletar`: confirmação e `deleteMarcaById`.

## Models e tabelas

| Função                                                         | Módulo      | Tabela   |
|----------------------------------------------------------------|-------------|----------|
| `listMarcas`, `insertMarca`, `updateMarca`, `deleteMarcaById`  | `marcas.ts` | `marcas` (migration 001) |

Excluir a marca deixa as variantes que a usavam "Sem marca" (`produto_variantes.marca_id` vira `NULL`, por
`ON DELETE SET NULL`); preços e histórico continuam.

## Validações e mensagens

| Situação           | Mensagem                               |
|--------------------|----------------------------------------|
| Nome vazio         | "Nome da marca é obrigatório"          |
| Falha ao carregar  | "Não foi possível carregar as marcas"  |
| Falha ao salvar    | "Não foi possível salvar a marca"      |
| Falha ao excluir   | "Não foi possível excluir a marca"     |

## Testes

Não há testes específicos deste cadastro.

## Observações

- O model não impede nomes repetidos: dá para ter duas marcas "Camil", e as variantes se dividem entre rótulos iguais
  (pendência em Tarefas). O formulário de variante acha a marca recém-criada pelo nome; como a lista vem da mais nova
  para a mais antiga, ele pega a que acabou de ser criada.
- Sem seta de voltar no header, como Categorias de produto e Empresas (pendência em Tarefas).
