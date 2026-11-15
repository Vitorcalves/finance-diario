# Busca de lançamentos (Lançamentos)

Abas **Início** e **Menu** · rota `BuscaLancamentos` (registrada nas pilhas `HomeStack` e `MenuStack`) · pasta
`src/views/BuscaLancamentos` · título "Lançamentos"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Mostra todo o histórico de lançamentos, sem o limite de 50 do feed da Home, com busca por texto (descrição, itens
comprados e empresa) e filtros de período, tipo, categoria, empresa, conta e tag. O topo resume quantos lançamentos
foram achados e quanto somam as saídas e as entradas. A lista e as ações de deslizar são as mesmas da Home.

## Navegação

- **Entradas:**
  - Home: lupa do header e "Ver todos" (sem filtros).
  - Gastos do mês: tocar numa categoria do gráfico troca para a aba Início e abre a busca com `categoriaId` (ou
    `SEM_CATEGORIA`) e o período do mês exibido.
  - Tags (pilha Menu): tocar no cartão de uma tag abre a busca com `tagId`, sem trocar de aba.
- **Parâmetros** (`FiltrosIniciaisBusca`, em `src/routes/types.ts`): `categoriaId`, `empresaId`, `tagId`, `inicio` e
  `fim` (YYYY-MM-DD). Com `inicio` ou `fim`, o período começa como "Personalizado".
- **Saída:** só o voltar do header (`navigation.goBack()`), porque a tela vive em duas pilhas.
- Chegar de novo com outros parâmetros recomeça a busca: o conteúdo é montado com `key={JSON.stringify(params)}`.

## Funcionalidades

### Busca e filtros (`FiltrosBusca`)

- **Campo de busca** "Buscar por descrição, item ou empresa", com botão de limpar. Cada palavra precisa aparecer em
  algum lugar (descrição, itens ou nome da empresa), em qualquer ordem, sem diferenciar acento nem maiúscula:
  "arroz bahamas" acha a compra no Bahamas que teve arroz. O filtro espera 250 ms depois da última tecla.
- **Pílulas de filtro**, numa fileira com rolagem horizontal. A pílula ativa fica destacada e mostra o valor escolhido;
  cada uma abre um painel de escolha única (`OpcoesSheet`):
  - **Período:** Este mês, Mês passado, Últimos 90 dias, Este ano, Todo o período (padrão) ou Personalizado.
    "Este mês" vai até o último dia do mês, para incluir as parcelas e assinaturas já lançadas para os próximos dias.
  - **Personalizado:** painel com "De" e "Até" (DD/MM/AAAA); um campo vazio não limita aquele lado. As datas só valem
    ao tocar em Aplicar. O rótulo vira "Setembro de 2026" (mês inteiro), "01/09/26 a 15/09/26", "Desde ..." ou
    "Até ...".
  - **Tipo:** Saídas e entradas, Só saídas, Só entradas.
  - **Categoria:** Todas, cada categoria (as de entrada com a legenda "Entrada") e Sem categoria.
  - **Empresa:** Todas ou uma empresa. As excluídas continuam na lista, depois das ativas e marcadas "(excluída)":
    os lançamentos antigos seguem ligados a elas.
  - **Conta:** Todas ou uma conta, inclusive inativas; acha a conta em qualquer ponta (origem ou destino).
  - **Tag:** só aparece quando existe alguma tag (ou quando a tela abriu filtrada por uma). Todas ou uma tag, com a
    anotação dela.
- **Limpar:** aparece com qualquer filtro ativo e volta tudo ao padrão (inclusive o texto).

### Resumo e lista

- Resumo no topo da lista (quando há resultado): "N lançamentos", "−R$ saídas" e "+R$ entradas". Todo lançamento
  conta na quantidade, mas só gasto e entrada entram nas somas: transferência e pagamento de fatura apenas mudam o
  dinheiro de lugar, e somar o pagamento junto com as compras do cartão contaria o mesmo gasto duas vezes.
- Lista por dia com o componente `ListaLancamentos` da Home: deslizar para Categoria, Tags (só gasto e entrada) e
  Excluir com "Desfazer". Detalhes na [Home](Home.md), seção "Lista de lançamentos".
- Sem resultado: "Nenhum lançamento encontrado", com a dica "Tente outro termo ou limpe os filtros." (há filtro) ou
  "Os lançamentos registrados aparecem aqui.".
- Diferente da Home, não há puxar para atualizar: a busca recarrega ao ganhar foco e a cada mudança de filtro.

## Arquivos

| Arquivo                       | Papel                                                                       |
|-------------------------------|-----------------------------------------------------------------------------|
| `index.tsx`                   | Lê os parâmetros, monta header, filtros, resumo e lista                     |
| `useBuscaLancamentos.ts`      | Estado dos filtros, busca no banco, filtro de texto, totais e ações         |
| `components/FiltrosBusca.tsx` | Campo de busca, pílulas e os painéis de cada filtro                         |

Reutiliza `src/views/Home/components/ListaLancamentos.tsx` (e com ele `TransacaoItem`, `CabecalhoDia` e
`TagsLancamentoSheet`).

```
BuscaLancamentosView (key = parâmetros)
└── ConteudoBusca
    ├── ScreenHeader "Lançamentos" (voltar)
    ├── FiltrosBusca
    │   ├── TextInput de busca + pílulas
    │   ├── OpcoesSheet: período, tipo, categoria, empresa, conta, tag
    │   └── BottomSheet "Período personalizado" (2 × BrazilianDateInput)
    └── LoadingState  |  ListaLancamentos (cabeçalho = resumo)
```

## Lógica (`useBuscaLancamentos`)

### Estado

- Filtros: `termo` (o que está digitado) e `termoAplicado` (o que filtra, 250 ms depois), `periodo`, `personalizado`,
  `tipo`, `categoriaId`, `empresaId`, `contaId` e `tagId`. Os iniciais vêm dos parâmetros da rota.
- Dados: `resultados`, `itens`, `compras` (registros de compra parcelada), `empresas`, `categorias`, `contas`, `tags`,
  `tagsPorTransacao`.
- `ultimaBusca` (ref): numera as buscas; só a mais recente entra na tela, para uma resposta atrasada não sobrescrever
  um filtro mais novo.

### Carga

`carregar()` roda ao ganhar foco e sempre que um filtro do banco muda (o `useFocusEffect` depende dele). Faz em
paralelo:

- `buscarTransacoes({ inicio, fim, empresaId, categoriaId, tipo, contaId, tagId })`, com o intervalo de
  `intervaloDoPeriodo(periodo, hoje, personalizado)`;
- `listItensTransacao()`, `listTransacoesCompra()`, `listEmpresas({ comExcluidos: true })` (com `ativosPrimeiro`),
  `listCategoriasLancamento()`, `listContas()`, `listTags()` e `listTagsPorTransacao()`. As empresas vêm com as
  excluídas para o lançamento antigo continuar com o nome e ser achado pelo texto ou pelo filtro (ver
  [Base comum](README.md), seção "Exclusão lógica dos cadastros").

O texto não vai para o SQL: `filtrarPorTexto` filtra em JavaScript, porque o `LIKE` do SQLite não ignora acentos
("acucar" precisa achar "Açúcar"). Depois: `agruparPorDia`, `totalizarBusca` e `agruparItensPorTransacao` (itens da
compra parcelada aparecem na 1ª parcela).

### A consulta (`buscarTransacoes`, em `transacoesModel.ts`)

- Natureza visível: `movimento`, `compra_cartao`, `transferencia` e `pagamento_fatura` (o registro da compra
  parcelada fica de fora).
- Período: `data >= inicio` e `data < fim + '~'`, para os lançamentos gravados com hora no último dia também
  entrarem.
- Empresa, categoria (`SEM_CATEGORIA` vira `categoria_id IS NULL`), tipo (`valor < 0` ou `valor > 0`), conta
  (`conta_id = ? OR conta_destino_id = ?`) e tag (`EXISTS` em `transacoes_tags`).
- Traz `itens_texto`: as descrições dos itens da linha, ou, na parcela 1, as do registro da compra do mesmo plano.
- Ordem: `data DESC, created_at DESC`, sem limite.

### Ações

Iguais às da Home, recarregando a busca depois: `excluir` (`excluirTransacao`), `restaurar` (`restaurarTransacao`),
`definirCategoria` (`definirCategoriaTransacao`), `definirTags` (`definirTagsTransacao`) e `criarTag` (`salvarTag` e
relê as tags).

`filtrosAtivos` é verdadeiro com texto, período diferente de "Todo o período" ou qualquer outro filtro escolhido.

## Models e tabelas

| Função                                                | Módulo                    | Tabelas                                   |
|-------------------------------------------------------|---------------------------|-------------------------------------------|
| `buscarTransacoes`, `listTransacoesCompra`            | `transacoesModel.ts`      | `transacoes`, `itens_transacao`, `transacoes_tags` |
| `excluirTransacao`, `restaurarTransacao`              | `transacoesModel.ts`      | `transacoes`, `itens_transacao`, `transacoes_tags` |
| `listItensTransacao`                                  | `itensTransacao.ts`       | `itens_transacao`                         |
| `listCategoriasLancamento`, `definirCategoriaTransacao` | `categoriasLancamento.ts` | `categorias_lancamento`, `transacoes`, `planos_pagamento` |
| `listContas`                                          | `contas.ts`               | `contas`                                  |
| `listEmpresas`                                        | `empresas.ts`             | `empresas`                                |
| `listTags`, `listTagsPorTransacao`, `definirTagsTransacao`, `salvarTag` | `tags.ts` | `tags`, `transacoes_tags`              |

Utilitários: `intervaloDoPeriodo`, `rotuloIntervalo` e `ROTULO_PERIODO` (`utils/periodos.ts`); `normalizarTexto`,
`correspondeBusca`, `filtrarPorTexto` e `totalizarBusca` (`utils/busca.ts`); `agruparPorDia`;
`agruparItensPorTransacao`.

## Testes

- `src/utils/busca.test.ts`: normalização, busca por palavras, por item e por empresa, totais.
- `src/utils/periodos.test.ts`: intervalos e rótulos dos períodos.
- `src/models/categoriasLancamento.test.ts`, bloco `buscarTransacoes`: sem limite, período com hora, filtros e texto
  dos itens.
- `src/models/tags.test.ts`, bloco "busca por tag".
- `src/models/transacoesModel.test.ts`, bloco "cartao na busca e nos planos".

## Observações

- Os filtros de conta e tipo não vêm por parâmetro de rota; só categoria, empresa, tag e período.
- O filtro de conta lista também as contas inativas (`listContas`), para achar o histórico delas.
