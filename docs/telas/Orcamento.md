# Orçamento

Aba **Análises** · rota `Orcamento` (pilha `DashboardStack`) · pasta `src/views/Orcamento` · título "Orçamento"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Pesquisa de preços na gôndola, sem gerar lançamento: o usuário escolhe o mercado e a data, adiciona os itens com o
preço visto e compara embalagens diferentes do mesmo produto (pelo preço por kg/L/un) e o total da lista em cada
mercado (os outros mercados usam o último preço do histórico). "Registrar no histórico" grava os preços pesquisados,
que passam a alimentar as comparações.

## Navegação

- **Entradas:** cartão "Orçamento" do [hub de Análises](Dashboard.md) e o atalho **Orçamento** da Home, que troca
  para a aba Análises com `initial: false` (o hub fica embaixo; o voltar leva a ele).
- **Saída:** voltar do header. Não recebe parâmetros.
- Os itens ficam só na memória da tela: trocar de aba mantém o orçamento, mas fechar o app o descarta. O que vai para
  o banco é só o que for registrado no histórico.

## Funcionalidades

### Aviso e dados da pesquisa

- Aviso fixo (`AvisoOrcamento`): "Este orçamento não gera lançamento financeiro. Os preços pesquisados vão para o
  histórico de preços e alimentam a comparação entre mercados."
- **Mercado** (`SeletorMultiplo`, escolha única, "Selecionar mercado" / "Trocar mercado") e **Data da pesquisa**
  (DD/MM/AAAA, começa hoje), em `DadosPesquisa`.

### Itens

- Cada item adicionado (`ItemOrcamentoCard`): "Produto - Marca • 1 kg", "2 x R$ 9,90 = R$ 19,80", o preço por unidade
  ("R$ 9,90/kg") e três botões: olho (abre o `HistoricoProdutoModal` daquela variante), editar e remover. Sem itens:
  "Nenhum item adicionado. Escolha produto, variante e o preço visto na gôndola."
- Mini formulário sempre visível (`ItemOrcamentoForm`, "Novo item" / "Editar item"):
  - **Produto** (com busca; produto de compra eventual não entra no orçamento) e o botão de código de barras.
  - **Variante** (chips); a variante é obrigatória, para comparar o mesmo item entre mercados.
  - Escolher a variante sugere o preço: o último visto naquele mercado ou, sem ele, o preço cadastrado da variante.
  - Referências: "Último preço em <mercado>: R$ X em data" (ou "Sem preço registrado neste mercado ainda" / "Selecione
    o mercado para ver o preço de referência") e "Menor preço já visto: R$ Y em <mercado>".
  - **Quantidade** (3 casas a granel) e **Preço pesquisado** (ou "por kg"), com a prévia do total a granel.
- A mesma variante não entra duas vezes: "Esta variante já está no orçamento. Edite o item existente."

### Mesmo produto, embalagens diferentes (`ComparativoVariantes`)

Para cada produto com duas variantes ou mais no orçamento: as variantes ordenadas pelo preço por unidade, com o selo
"Mais barato" na de menor R$/kg e "+N% mais caro por medida" nas outras. Sem medida em alguma: "Sem comparação por
unidade: cadastre quantidade e unidade nas variantes para comparar o preço por medida." É o motivo de a tela existir:
um leite de 500 ml a R$ 5,00 (R$ 10,00/L) sai mais barato que um de 1 L a R$ 12,00.

### Comparativo entre mercados (`ComparativoMercados`)

- Um cartão por mercado com o total simulado e "N de M itens com preço". O mercado escolhido ganha o selo "Orçamento
  atual" e usa os preços digitados agora; os demais usam o preço mais recente do histórico de cada variante.
- Ordem: os mercados que têm todos os itens primeiro, depois os com mais itens com preço; no empate, o mais barato.
- "Mais barato" só é eleito entre os mercados completos, e só com dois completos ou mais.

### Rodapé (`RodapeOrcamento`)

- **Total do orçamento** (soma de quantidade × preço).
- **Limpar**: com itens, confirma ("Deseja descartar os itens deste orçamento?"); volta a data para hoje.
- **Registrar no histórico**: confere mercado, data e itens; grava um registro de preço por item, todos ou nenhum;
  limpa o orçamento, recarrega o histórico e avisa "N preços registrados no histórico de <mercado>".

## Arquivos

| Arquivo                               | Papel                                                              |
|---------------------------------------|--------------------------------------------------------------------|
| `index.tsx`                           | Monta a tela, controla o item em edição e a confirmação de limpar  |
| `useOrcamento.ts`                     | Cadastros, itens, comparações e o registro no histórico            |
| `types.ts`                            | `ItemOrcamento`, `ItemComUnitario`, `ComparativoProduto`, `ComparativoMercado`... |
| `components/AvisoOrcamento.tsx`       | Aviso de que não gera lançamento                                   |
| `components/DadosPesquisa.tsx`        | Mercado e data                                                     |
| `components/ItemOrcamentoCard.tsx`    | Item com histórico, editar e remover                               |
| `components/ItemOrcamentoForm.tsx`    | Mini formulário de item, com scanner e referências                 |
| `components/ComparativoVariantes.tsx` | Embalagens do mesmo produto por R$/kg                              |
| `components/ComparativoMercados.tsx`  | Total em cada mercado                                              |
| `components/RodapeOrcamento.tsx`      | Total, Limpar e Registrar                                          |

```
OrcamentoView
├── ScreenHeader (voltar)
├── KeyboardAvoidingScreen → ScrollComTeclado
│   ├── AvisoOrcamento
│   ├── DadosPesquisa (SeletorMultiplo + BrazilianDateInput)
│   ├── ItemOrcamentoCard* (→ HistoricoProdutoModal)
│   ├── ItemOrcamentoForm (SeletorMultiplo + ScannerCodigoBarras, ChipSelector, campos)
│   ├── ComparativoVariantes
│   └── ComparativoMercados
└── RodapeOrcamento
```

## Lógica (`useOrcamento`)

### Carga

A cada foco, sem trocar a tela pelo indicador (o item que estava sendo digitado continua): `listEmpresas()`,
`listProdutos()`, `listProdutoVariantes()`, `listMarcas({ comExcluidos: true })`, `listHistoricoPrecoDeAtivos()` e
`getLocalPadrao()`.

Empresas, produtos e variantes vêm só os ativos; as marcas vêm com as excluídas, porque a variante que já usa uma
continua com ela no rótulo. O histórico é o dos cadastros ativos (ver [Base comum](README.md), seção "Exclusão lógica
dos cadastros"): um mercado excluído não entra no comparativo, e o preço visto nele continua valendo como último e
menor preço da variante, sem mercado.

### Derivados

- `ultimoPreco(variante, mercado?)`: o registro mais recente da variante (no mercado, se informado), com
  `maisRecentePrimeiro` (data e, no empate, `created_at`).
- `menorPrecoRegistrado(variante)` e `precoBaseDaVariante(variante)`.
- `itensComUnitario`: cada item com `precoPorUnidadePrimaria`.
- `comparativoVariantes = agruparVariantesPorProduto(itensComUnitario)`: só produtos com 2 itens ou mais; comparável
  quando todos têm medida na mesma unidade primária.
- `comparativo = compararMercados(itens, historico, { incluir: [mercado escolhido], precoFixo })`: no mercado
  escolhido vale o preço digitado; nos outros, `precoDoItem` (o último preço da variante ali). Mercado sem preço de
  nenhum item só entra se for o escolhido.
- `menorTotalCompleto`: o menor total entre os mercados completos, com dois completos ou mais.

### Registro

`registrarPrecos` valida (mercado, data `YYYY-MM-DD`, ao menos um item) e, em `emTransacao`, chama
`registrarPrecoVariante` para cada item: atualiza o preço atual da variante e insere em `historico_preco` com o
mercado, o preço, a data da pesquisa e o local padrão.

## Models e tabelas

| Função                                       | Módulo                 | Tabelas                                |
|----------------------------------------------|------------------------|----------------------------------------|
| `listHistoricoPrecoDeAtivos`                 | `historicoPreco.ts`    | `historico_preco`, `produtos`, `produto_variantes`, `empresas` |
| `registrarPrecoVariante`                     | `produtoVariantes.ts`  | `produto_variantes`, `historico_preco` |
| `listProdutos`, `listProdutoVariantes`, `listMarcas`, `listEmpresas` | vários | cadastros                     |
| `getLocalPadrao`                             | `settingsModel.ts`     | `settings`                             |
| `listHistoricoPorProduto`, `listPrecosPagosPorProduto` (modal) | `dashboard.ts` | `historico_preco`, `itens_transacao`, `transacoes` |

Utilitários: `compararMercados`, `maisRecentePrimeiro`, `precoDoItem` e `menorTotalCompleto`
(`utils/comparativoMercados.ts`), `agruparVariantesPorProduto` (`utils/comparativoVariantes.ts`),
`precoPorUnidadePrimaria`, `ehGranel`, `medidaGranel`, `rotuloQuantidade` e `rotuloVariantePorId`
(`utils/variantes.ts`).

## Validações e mensagens

| Situação                          | Mensagem                                                            |
|-----------------------------------|---------------------------------------------------------------------|
| Item sem produto                  | "Selecione o produto"                                               |
| Item sem variante                 | "Selecione a variante para comparar o mesmo item entre mercados"    |
| Quantidade zero                   | "Quantidade deve ser maior que zero" (a granel: "Informe o peso em kg (ex.: 0,750)") |
| Preço zero                        | "Preço deve ser maior que zero"                                     |
| Variante repetida                 | "Esta variante já está no orçamento. Edite o item existente."       |
| Registrar sem mercado             | "Selecione o mercado onde os preços foram pesquisados"              |
| Registrar com data inválida       | "Informe uma data válida"                                           |
| Registrar sem itens               | "Adicione ao menos um item ao orçamento"                            |
| Falha ao registrar                | "Não foi possível registrar os preços no histórico"                 |

## Testes

- `src/utils/comparativoMercados.test.ts`: `precoDoItem`, `compararMercados` e `menorTotalCompleto`.
- `src/utils/comparativoVariantes.test.ts`: a embalagem mais barata por unidade.
- `src/utils/variantes.test.ts`.

## Observações

- Diferente da Lista de compras, o orçamento não fica salvo no banco; para guardar uma pesquisa entre sessões, é
  preciso registrá-la no histórico.
- A data registrada no histórico é só o dia (sem hora), ao contrário dos lançamentos, que gravam a hora local.
