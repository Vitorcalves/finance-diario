# Empresas

Aba **Menu** · rota `Empresas` (pilha `MenuStack`) · pasta `src/views/Empresas` · título "Empresas"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Cadastro dos mercados e lojas onde o usuário compra. A empresa é usada no lançamento (e sugere a categoria usada por
último nela), é o "mercado" da Lista de compras e do Orçamento, e identifica onde cada preço do histórico foi visto.

## Navegação

- **Entrada:** Menu › Cadastros › Empresas. A Lista de compras manda o usuário para cá quando não há empresa
  ("Cadastre os mercados em Menu → Empresas").
- **Saída:** só o voltar do sistema: o header não tem a seta de voltar.

## Funcionalidades

- Lista de cartões (`EmpresaCard`): nome, "CNPJ: ..." e "Obs: ..." quando houver, com editar e excluir. Da mais nova
  para a mais antiga.
- "+" do header (ou "Adicionar Empresa" no estado vazio) abre o painel "Nova empresa" (`EmpresaFormModal`):
  - **Nome da empresa \*** (placeholder "Ex.: Mercado Central");
  - **CNPJ** (teclado de números e pontuação; texto livre, sem máscara nem validação);
  - **Observação** (várias linhas).
- O lápis abre o painel como "Editar empresa".
- **Excluir:** confirma ("Deseja excluir "X"?") e avisa "Empresa excluída".
- Avisos: "Empresa adicionada" / "Empresa atualizada".

## Arquivos

| Arquivo                            | Papel                                     |
|------------------------------------|-------------------------------------------|
| `index.tsx`                        | Header, lista e painel                    |
| `useEmpresas.ts`                   | Carga, salvar (criar ou editar) e excluir |
| `components/EmpresaCard.tsx`       | Cartão com nome, CNPJ e observação        |
| `components/EmpresaFormModal.tsx`  | Painel com nome, CNPJ e observação        |

```
EmpresasView
├── ScreenHeader (+, sem voltar)
├── LoadingState | EmptyState | ScrollView → EmpresaCard*
└── EmpresaFormModal (BottomSheet)
```

## Lógica (`useEmpresas`)

- A cada foco: `listEmpresas()` (`ORDER BY created_at DESC`).
- `salvar(dados, editando)`: limpa os espaços; CNPJ e observação vazios viram `NULL`; recusa nome vazio;
  `updateEmpresa` ou `insertEmpresa` (UUID novo).
- `deletar`: confirmação e `deleteEmpresaById`.

## Models e tabelas

| Função                                                              | Módulo        | Tabela     |
|---------------------------------------------------------------------|---------------|------------|
| `listEmpresas`, `insertEmpresa`, `updateEmpresa`, `deleteEmpresaById` | `empresas.ts` | `empresas` (migration 001) |

### O que a exclusão leva junto

- Lançamentos, planos e registros do histórico de preços continuam, mas sem a empresa (`empresa_id` vira `NULL`).
- Sai da comparação da Lista de compras, com todas as cotações anotadas nela (`ON DELETE CASCADE`). Se era o mercado
  atual, a lista o esquece na próxima carga.
- A sugestão de categoria por empresa daquela loja deixa de existir.

## Validações e mensagens

| Situação           | Mensagem                                 |
|--------------------|------------------------------------------|
| Nome vazio         | "Nome da empresa é obrigatório"          |
| Falha ao carregar  | "Não foi possível carregar as empresas"  |
| Falha ao salvar    | "Não foi possível salvar a empresa"      |
| Falha ao excluir   | "Não foi possível excluir a empresa"     |

## Testes

Não há testes específicos deste cadastro; o efeito da exclusão na Lista de compras é coberto em
`src/models/listaCompras.test.ts`.

## Observações

- O nome "Empresas" cobre mercados, lojas e qualquer estabelecimento; não há tipo de empresa.
- O model não impede nomes repetidos (pendência em Tarefas).
- Sem seta de voltar no header, como Categorias de produto e Marcas (pendência em Tarefas).
