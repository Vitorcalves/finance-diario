# Empresas

Aba **Menu** · rota `Empresas` (pilha `MenuStack`) · pasta `src/views/Empresas` · título "Empresas"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Cadastro dos mercados e lojas onde o usuário compra. A empresa é usada no lançamento, é o "mercado" da Lista de
compras e do Orçamento, e identifica onde cada preço do histórico foi visto. Cada empresa pode ser vinculada a
quantas categorias de lançamento o usuário quiser: no lançamento, a categoria escolhida encurta a lista de empresas, e
a empresa escolhida sugere a categoria.

## Navegação

- **Entrada:** Menu › Cadastros › Empresas. A Lista de compras manda o usuário para cá quando não há empresa
  ("Cadastre os mercados em Menu → Empresas").
- **Saída:** só o voltar do sistema: o header não tem a seta de voltar.

## Funcionalidades

- Header com o subtítulo "N empresas".
- **Busca** "Buscar empresa por nome ou CNPJ", com botão de limpar. Cada palavra precisa aparecer no nome ou no CNPJ,
  em qualquer ordem, sem diferenciar acento nem maiúscula. O CNPJ é achado com ou sem a pontuação ("12345" acha
  "12.345.678/0001-00").
- **Filtro por categoria** (chips com contador): "Todas", uma por categoria de lançamento que tenha empresa e "Sem
  categoria" (as que ainda não foram vinculadas). Só aparece quando alguma empresa tem categoria.
- Lista de cartões (`EmpresaCard`) em **ordem alfabética**: nome, "CNPJ: ...", "Obs: ..." e as categorias vinculadas
  (ícone e nome), com editar e excluir.
- Sem resultado: "Nenhuma empresa encontrada para "X"" ou "Nenhuma empresa neste filtro".
- "+" do header (ou "Adicionar Empresa" no estado vazio) abre o painel "Nova empresa" (`EmpresaFormModal`):
  - **Nome da empresa \*** (placeholder "Ex.: Mercado Central");
  - **Categorias de lançamento** (`SeletorMultiplo` de várias escolhas, com busca): saídas e entradas, as de entrada
    marcadas com "(entrada)". Opcional;
  - **CNPJ** (teclado de números e pontuação; texto livre, sem máscara nem validação);
  - **Observação** (várias linhas).
- O lápis abre o painel como "Editar empresa", com as categorias já vinculadas marcadas.
- **Nome único:** criar ou renomear para o nome de outra empresa ativa é recusado com o alerta "Nome repetido" ("Já
  existe a empresa "Bahamas"."), sem diferenciar maiúsculas, acentos nem espaços sobrando; o painel continua aberto.
- **Excluir:** confirma ("Deseja excluir "X"? Ela sai do cadastro, do lançamento e da lista de compras. Os lançamentos
  e o histórico de preços continuam com o nome dela.") e avisa "Empresa excluída".
- Avisos: "Empresa adicionada" / "Empresa atualizada".

### O que o vínculo com a categoria faz

No formulário de lançamento ([Home](Home.md)):

- Com uma categoria escolhida, o seletor de empresa lista as empresas dessa categoria e as que não têm categoria
  nenhuma (ainda não classificadas). As vinculadas só a outras categorias somem da lista, mas continuam sendo achadas
  ao digitar o nome: o filtro encurta a lista, não impede o lançamento.
- Ao escolher a empresa, a categoria sugerida sai das vinculadas: a usada por último, se for uma delas, ou a única.
  Empresa sem categoria continua sugerindo a do último lançamento nela.

## Arquivos

| Arquivo                            | Papel                                                        |
|------------------------------------|--------------------------------------------------------------|
| `index.tsx`                        | Header, busca, filtro por categoria, lista e painel          |
| `useEmpresas.ts`                   | Carga (empresas, categorias e vínculos), salvar e excluir    |
| `components/EmpresaCard.tsx`       | Cartão com nome, CNPJ, observação e categorias               |
| `components/EmpresaFormModal.tsx`  | Painel com nome, categorias de lançamento, CNPJ e observação |

```
EmpresasView
├── ScreenHeader (+, sem voltar)
├── busca + ChipSelector (categorias)
├── LoadingState | EmptyState | ScrollView → EmpresaCard*
└── EmpresaFormModal (BottomSheet: SeletorMultiplo de categorias)
```

## Lógica (`useEmpresas`)

- A cada foco: `listEmpresas()` (só as ativas, em ordem alfabética, feita no model com `localeCompare` em pt-BR: "Água"
  fica junto do "A"), `listCategoriasLancamento()` e `listCategoriasPorEmpresa()` (mapa empresa ativa → ids das
  categorias).
- `salvar(dados, editando)`: limpa os espaços; CNPJ e observação vazios viram `NULL`; recusa nome vazio;
  `updateEmpresa` ou `insertEmpresa` (UUID novo), os dois recebendo `categoriaIds` e gravando os vínculos na mesma
  transação. O `NomeRepetidoError` do model vira o alerta "Nome repetido".
- `deletar`: confirmação e `deleteEmpresaById`.
- A busca e o filtro rodam na tela, sobre a lista já carregada (`correspondeBusca`, de `src/utils/busca.ts`). Se a
  categoria filtrada fica sem empresa, o filtro volta para "Todas".

## Models e tabelas

| Função                                                                | Módulo        | Tabela     |
|-----------------------------------------------------------------------|---------------|------------|
| `listEmpresas`, `insertEmpresa`, `updateEmpresa`, `deleteEmpresaById` | `empresas.ts` | `empresas` (migrations 001 e 020) |
| `listCategoriasPorEmpresa`, `definirCategoriasEmpresa`                | `empresas.ts` | `empresas_categorias_lancamento` (migration 019) |
| `listCategoriasLancamento`                                            | `categoriasLancamento.ts` | `categorias_lancamento` |
| `exigirNomeLivre`, `NomeRepetidoError`                                | `nomeRepetido.ts` | — |

- **Nome único:** `insertEmpresa` e `updateEmpresa` leem as empresas ativas e chamam `exigirNomeLivre` dentro da
  transação, antes de gravar (regra geral em [Base comum](README.md), seção "Nome único nos cadastros"). Recusada, a
  empresa não é gravada nem tem os vínculos trocados. Só as ativas contam: o nome de uma excluída pode ser usado de
  novo. Editar sem trocar o nome sempre passa, então duas empresas iguais de antes da regra ainda têm CNPJ,
  observação e categorias editáveis.
- `empresas_categorias_lancamento`: `empresa_id`, `categoria_id` (chave primária composta, então o mesmo par não entra
  duas vezes) e `created_at`. As duas colunas têm `ON DELETE CASCADE`.
- `updateEmpresa(empresa)` sem o segundo argumento não mexe nos vínculos; com a lista (mesmo vazia), troca todos.
- Categoria que não existe mais é pulada ao gravar o vínculo.

### O que a exclusão faz

A exclusão é **lógica** (migration 020; regra geral em [Base comum](README.md), seção "Exclusão lógica dos
cadastros"): `deleteEmpresaById` não apaga a linha, grava a data em `empresas.deleted_at`.

- Lançamentos, planos e registros do histórico de preços **continuam com a empresa** (`empresa_id` não muda). A Home, a
  Busca, o Mês, os Planos e as análises de preço mostram o nome dela normalmente; no filtro de empresa da Busca ela
  aparece depois das ativas, como "(excluída)".
- Some deste cadastro, do seletor de empresa do lançamento, das assinaturas novas, do Orçamento e dos mercados da Lista
  de compras.
- Sai da comparação da Lista de compras, com todas as cotações anotadas nela (`removerMercadoDaLista`, na mesma
  transação: a lista é rascunho, não histórico). Se era o mercado atual, a lista o esquece na próxima carga.
- Os vínculos com as categorias de lançamento ficam no banco, mas o `listCategoriasPorEmpresa` deixa de listá-los.
- Na Lista de compras e no Orçamento, o preço já visto nela continua valendo como "último preço" e "menor preço" da
  variante, mas sem mercado: ela não entra na comparação entre mercados (`listHistoricoPrecoDeAtivos`).

Não há tela para desfazer a exclusão.

## Validações e mensagens

| Situação           | Mensagem                                 |
|--------------------|------------------------------------------|
| Nome vazio         | "Nome da empresa é obrigatório"          |
| Nome repetido      | "Já existe a empresa "X"." (alerta "Nome repetido") |
| Falha ao carregar  | "Não foi possível carregar as empresas"  |
| Falha ao salvar    | "Não foi possível salvar a empresa"      |
| Falha ao excluir   | "Não foi possível excluir a empresa"     |

## Testes

- `src/models/empresas.test.ts`: ordem alfabética com acento e maiúscula, vínculos (criar, trocar, limpar, repetida ou
  inexistente), a empresa excluída escondendo os vínculos sem apagar e a categoria excluída saindo das empresas.
- `src/models/exclusaoLogica.test.ts`: a empresa excluída sai da listagem, o lançamento e o histórico de preços
  continuam com ela, e o mercado sai da comparação da Lista de compras com as cotações.
- `src/models/nomeRepetido.test.ts`: nome repetido recusado sem gravar a empresa nem os vínculos, nome de empresa
  excluída liberado, edição que não troca o nome e as repetidas de antes da regra.
- `src/utils/empresasPorCategoria.test.ts`: quais empresas o lançamento esconde em cada categoria e qual categoria a
  empresa sugere.

## Observações

- O nome "Empresas" cobre mercados, lojas e qualquer estabelecimento; não há tipo de empresa.
- O vínculo com a categoria só vale no formulário de novo lançamento. O formulário de assinatura (Planos) e os filtros
  da Busca continuam listando todas as empresas.
- A ordem alfabética vale em todo lugar que lista empresas (lançamento, busca, planos, lista de compras, orçamento,
  histórico), porque vem do model.
- Empresas de mesmo nome criadas antes da regra do nome único continuam no cadastro: não há migration que junte.
  Renomeie ou exclua uma das duas.
- Sem seta de voltar no header, como Categorias de produto e Marcas (pendência em Tarefas).
