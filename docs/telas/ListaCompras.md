# Lista de compras

Aba **Início** · rota `ListaCompras` (pilha `HomeStack`) · pasta `src/views/ListaCompras` · título "Lista de compras"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Monta a lista do mercado e funciona como pesquisa de preços: em cada mercado visitado, o usuário anota o preço de
cada item (e, se quiser comparar, de várias marcas e embalagens do mesmo item). A tela compara os mercados lado a
lado, mostra onde cada item e a compra toda saem mais baratos e, no mercado escolhido, os itens vão para o carrinho.
Finalizar abre o formulário de lançamento já preenchido com o carrinho e leva os preços ao histórico. Tudo fica no
banco: fechar o app no meio da compra não perde nada.

## Navegação

- **Entrada:** atalho **Lista** da Home.
- **Saída:** só o voltar do header. A tela não abre outras telas; para fechar a compra ela usa o `NovoLancamentoForm`
  da Home, como painel.
- O subtítulo do header mostra "N a comprar · M no carrinho" quando a lista não está vazia.

## Conceitos

- **Item:** um produto cadastrado ou um texto livre ("papel toalha"), com quantidade (inteira, ou peso/volume quando a
  variante é a granel). O item pode fixar a marca/embalagem que quer levar (`variante_id`) ou aceitar qualquer uma.
  `comprado = 1` significa "no carrinho".
- **Mercados da comparação:** as empresas escolhidas para a pesquisa (`lista_compras_mercados`), na ordem em que
  entraram.
- **Mercado atual:** onde o usuário está agora (chave `lista_compras_mercado` em `settings`). Os campos de preço da
  lista anotam nele e o fechamento usa os preços dele. Tocar de novo no mercado atual desmarca.
- **Cotação:** o preço de uma marca/embalagem de um item num mercado (`lista_compras_precos`). O mesmo item pode ter
  várias no mesmo mercado, uma por variante. Variante vazia é "marca não informada"; num produto com uma variante só,
  vale essa única.
- **Cotação que vale** (por item e mercado): a da variante que o item quer levar, se ela foi cotada ali; senão a mais
  barata. A mais barata é comparada por kg/L/un quando todas as cotações reduzem à mesma unidade primária (um leite
  de 500 ml mais barato na prateleira pode sair mais caro por litro); senão, pelo preço cheio. No empate, fica a
  anotada primeiro (`compararCotacoes`).

## Funcionalidades

### Adicionar rápido (`AdicionarRapido`)

- Campo "Adicionar item (ex.: arroz, papel toalha)". Com 2 letras ou mais, mostra até 6 produtos que batem com o texto
  (sem acento nem maiúscula); os que começam com o texto vêm antes dos que só o contêm. Produto já na lista aparece com
  "na lista".
- Tocar num produto adiciona o produto; "Adicionar "texto" como item avulso" adiciona texto livre. Confirmar no
  teclado adiciona o primeiro produto sugerido (ou o texto, sem sugestão). O campo limpa e já aceita o próximo.
- Com o campo vazio, o ícone de código de barras abre a câmera.
- Produto que já está na lista e ainda não foi comprado não entra de novo ("X já está na lista").
- Produto com hábito de compra (comprado em 2 dias ou mais, e não abandonado) entra com a variante da última compra e
  a quantidade de costume; o hábito vem do histórico de lançamentos (`sugerirCompras`).
- Um texto igual ao nome de um produto (sem acento/maiúscula) vira esse produto.

### Costuma comprar (`SugestoesLista`)

- Faixa horizontal com até 12 produtos frequentes que ainda não estão na lista, "Pelo histórico dos seus lançamentos".
  Cada chip mostra quanto a última compra deve durar e há quanto tempo foi: "dura ~15 dias · há 18 dias" (ou "dura 1
  dia", "hoje", "ontem").
- A duração leva em conta a quantidade comprada: quem costuma levar 3 e levou 15 só volta a ser lembrado 5 vezes mais
  tarde. Embalagens de tamanhos diferentes contam pelo tamanho (1 pacote de 5 kg = 5 de 1 kg).
- Os que já estão "na hora" (passaram de 80% da duração esperada da última compra) vêm primeiro e destacados; com 2 ou
  mais, aparece o botão "Adicionar N".
- Tocar num chip adiciona o produto com a variante da última compra e a quantidade mais comum.
- Produto de compra eventual nunca é sugerido.

### Mercados (`MercadosLista`)

- Sem mercados: botão "Escolher mercados". Com mercados: um cartão por mercado com o total da lista nele ("N de M com
  preço") e o selo "Mais barato"; o mercado atual aparece marcado, com "Você está aqui". "Editar" abre o painel.
- Painel "Mercados para comparar": todas as empresas em ordem alfabética, com caixa de marcar. Sem empresa cadastrada,
  pede para cadastrar em Menu → Empresas.
- Tirar um mercado com preços anotados pede confirmação ("N preços anotados lá serão apagados").
- Avisos da comparação:
  - "X sai R$ Y mais barato que Z, comparando os N itens com preço em todos os mercados."
  - "Comprando cada um onde é mais barato (N mercados), esses itens saem R$ X: R$ Y a menos."
  - Com 2 ou mais mercados e preços, mas nenhum item com preço em todos: "Anote o preço do mesmo item em mais de um
    mercado para ver qual sai mais barato."
- Escolher como atual um mercado fora da comparação já o inclui nela.

### A comprar e No carrinho

- Duas seções: "A comprar (N)" e "No carrinho (N)", cada uma com o título "Preço · <mercado atual>" à direita. Sem
  pendentes: "Tudo no carrinho. Finalize para registrar a compra.".
- A ordem é a de entrada; o que vai para o carrinho passa para a seção de baixo.
- Dica no fim muda conforme haja mercado atual.
- Lista vazia: "Sua lista está vazia" com a explicação do fluxo.
- Puxar para baixo recarrega (e antes grava o que estiver pendente).

### Linha do item (`ItemListaRow`)

- Caixa de marcar à esquerda: põe ou tira do carrinho (com vibração).
- Nome (riscado no carrinho), detalhe "2 un. · Marca 1 kg" (ou "0,750 kg", ou "Qualquer marca" num produto sem
  variante fixada), "N opções aqui" quando há várias marcas cotadas no mercado atual e os preços dos outros mercados
  ("Bahamas 9,90 · Atacadão 8,50", com o menor destacado quando o item tem 2 cotações ou mais).
- À direita, só com mercado atual:
  - **Uma cotação ou nenhuma:** campo de preço na própria linha. A dica do campo vazio é o último preço do histórico
    naquele mercado ("últ. 9,90"). A tecla "próximo" do teclado pula para o preço do item seguinte (itens com várias
    cotações ficam fora dessa ordem).
  - **Várias cotações:** mostra o preço da que vale, com uma seta; o toque abre o painel do item.
  - Legendas: diferença para o menor dos outros mercados ("menor preço", "menor por L", "+R$ 0,50" ou "+R$ 0,30/L"),
    o preço por unidade ("R$ 8,90/kg") e a marca da cotação que vale, quando ela diz algo a mais.
  - "qual marca?": aparece quando a única cotação ali está sem marca e o produto tem mais de uma variante. Abre o
    painel "Marca vista em <mercado>" (`OpcoesSheet`), que avisa que sem a marca o preço não vai para o histórico.
- Tocar na linha abre o painel do item; deslizar mostra "Excluir" (com "Desfazer" no aviso).

### Painel do item (`ItemListaForm`)

- **Produto** (`SeletorMultiplo`, eventuais só aparecem na busca) ou, sem produto, "Ou escreva o item".
- **Marca / embalagem que vai levar:** chips "Qualquer" e cada variante. Com "Qualquer", vale a mais barata por
  kg/L/un de cada mercado.
- Referências: "Menor preço já visto: R$ X em <mercado> (data)" e "Preço cadastrado: R$ Y" da variante.
- **Quantidade:** inteira, ou com 3 casas a granel ("Quantidade (kg)"). Trocar entre pacote e granel limpa o campo ou
  volta para 1.
- **Preço em cada mercado:** o mercado atual primeiro, com "você está aqui".
  - Produto com uma variante (ou texto livre): um campo por mercado, com "último: R$ X em data" e "menor preço"
    quando aquele mercado é o mais barato entre os mercados.
  - Produto com várias variantes: em cada mercado, uma linha por marca/embalagem cotada. Cada linha tem a marca
    (tocar troca, com "Não informada"), o campo de preço, o preço por unidade, "mais barato por kg"/"menor preço" ou
    "+12% por kg", e o X para tirar a linha. "Outra marca/embalagem" adiciona uma linha com as variantes ainda não
    cotadas ali (e foca o campo). O círculo fixa a marca daquela cotação como a que o item vai levar; tocar de novo
    volta para "qualquer". Uma dica explica o que está sendo levado.
  - Sem mercados: "Escolha os mercados no card "Mercados" da lista para anotar os preços."
- Lendo um código de barras com mercado atual, o painel abre com a linha daquela marca no mercado atual; se ela ainda
  está sem preço, o teclado já abre no campo.
- Salvar grava o item e as cotações: as que ficaram sem preço são apagadas.

### Código de barras

Pelo campo de adicionar ou pelo menu. Acha a variante pelo `codigo_barras`:

- Se o produto já está na lista, abre o item dele (o da mesma variante, senão o pendente, senão o primeiro).
- Se não está, adiciona o produto com essa variante ("X adicionado à lista").
- Com mercado atual, a cotação já sai com a marca lida.
- Código desconhecido: "Nenhuma variante cadastrada com o código ...".

### Menu "..." (`MenuAcoes`)

- **Adicionar item com detalhes:** abre o painel vazio.
- **Ler código de barras.**
- Com itens na lista, também:
  - **Salvar preços no histórico:** leva ao histórico as cotações que ainda não estão lá. Aviso "N preços salvos no
    histórico", ou "Nada novo para salvar", e quantos itens ficaram de fora por falta de marca.
  - **Apagar preços anotados** (com confirmação): apaga todas as cotações, mantém itens e mercados. Serve para começar
    uma nova rodada de pesquisa.
  - **Tirar da lista o que está no carrinho** (com confirmação): remove os comprados sem registrar a compra.
  - **Esvaziar lista** (com confirmação): remove todos os itens e preços.

### Rodapé e fechamento (`RodapeLista`)

- Rodapé fixo: "Total em <mercado atual>" (soma do que tem preço lá, "N de M itens com preço"), "No carrinho (N)" com
  o valor do carrinho e "N sem preço".
- **Finalizar compra** (só com algo no carrinho) confere:
  - carrinho vazio: "Marque os itens que foram para o carrinho.";
  - sem mercado atual: "Toque no mercado em que você está, em "Mercados", para registrar a compra com os preços de lá.";
  - item do carrinho sem preço no mercado atual: "Anote o preço em <mercado> de: ...".
- Tudo certo, monta o rascunho e abre o `NovoLancamentoForm`: descrição "Compras - <mercado>", empresa = mercado
  atual, categoria Mercado (se existir) e um item por produto do carrinho, com a variante e o preço da cotação que vale
  ("Arroz - Marca 5 kg"). O usuário confere e salva.
- Ao mesmo tempo, as outras cotações da pesquisa (as que não foram compradas) vão para o histórico. A cotação comprada
  vai com o próprio lançamento, com o preço confirmado nele.
- Salvar grava o lançamento e tira da lista os itens comprados, numa transação só. Aviso: "Compra registrada. N preços
  da pesquisa foram para o histórico." ou "Compra registrada; os itens comprados saíram da lista".

## Arquivos

| Arquivo                           | Papel                                                                          |
|-----------------------------------|--------------------------------------------------------------------------------|
| `index.tsx`                       | Monta a tela, o menu, o painel de marca, o scanner e o fechamento              |
| `useListaCompras.ts`              | Estado, comparação, gravação otimista, histórico e fechamento                  |
| `components/AdicionarRapido.tsx`  | Campo de adicionar com sugestões de produto                                    |
| `components/SugestoesLista.tsx`   | Faixa "Costuma comprar"                                                        |
| `components/MercadosLista.tsx`    | Cartão dos mercados, avisos da comparação e painel de escolha                  |
| `components/ItemListaRow.tsx`     | Linha do item, com caixa do carrinho e campo de preço                          |
| `components/ItemListaForm.tsx`    | Painel do item: produto, marca, quantidade e cotações por mercado              |
| `components/RodapeLista.tsx`      | Totais e botão Finalizar compra                                                |

```
ListaComprasView
├── ScreenHeader (subtítulo com contadores, menu "...")
├── KeyboardAvoidingScreen → ScrollComTeclado (puxar para atualizar)
│   ├── AdicionarRapido
│   ├── SugestoesLista
│   ├── MercadosLista (+ BottomSheet "Mercados para comparar")
│   ├── seção "A comprar": ItemListaRow* (SwipeableRow, BrazilianIntegerInput)
│   └── seção "No carrinho": ItemListaRow*
├── RodapeLista
├── ItemListaForm (BottomSheet)
├── MenuAcoes
├── OpcoesSheet "Marca vista em ..."
├── NovoLancamentoForm (rascunho do carrinho)
└── ScannerCodigoBarras
```

## Lógica (`useListaCompras`)

### Carga

`carregarDoBanco` lê em paralelo: itens, cotações, mercados da comparação, mercado atual, produtos, variantes, marcas,
empresas, categorias de lançamento, todo o histórico de preços, as compras passadas de produtos
(`listComprasDeProdutos`) e o local padrão. Se o mercado atual saiu da comparação (ou foi excluído), ele é esquecido.
A carga roda ao ganhar foco; antes, grava o que estiver pendente.

### Gravação otimista

- `gravar(aplicar, acao)`: aplica a mudança na tela na hora e põe a gravação numa fila (`fila`, uma promise
  encadeada), para dois toques rápidos não gravarem fora de ordem. Se a gravação falha, aparece "Não foi possível
  salvar a alteração na lista" e a tela relê o banco.
- Preços digitados não vão um a um: `anotarCotacao`/`apagarCotacao` atualizam a tela e guardam a gravação em
  `gravacoesPendentes` (vale a mais nova de cada cotação). 600 ms depois da última tecla, `gravarPendentes` manda o
  lote para a fila. Sair da tela (perder o foco ou desmontar) grava na hora.
- `criadasPeloCampo` lembra o id da cotação criada pelo campo da linha em cada item/mercado: a tecla seguinte cai na
  mesma cotação, mesmo antes de a tela atualizar.
- Remover item, tirar mercado, apagar preços ou esvaziar descartam as gravações pendentes que deixariam de fazer
  sentido.

### Derivados

- `cotacoesValidas`: cotação cuja variante saiu do cadastro fica sem marca.
- `cotacoesPorChave` (item|mercado): cada cotação com a variante que vale para ela (a anotada ou a única do produto) e
  o preço por unidade (`precoPorUnidadePrimaria`).
- `valePorChave`: a cotação que vale em cada item|mercado (`compararCotacoes`).
- `comparativo = compararLista(itens, mercados, cotações que valem)`: totais por mercado, mais barato, vantagem,
  divisão entre mercados e o menor preço de cada item.
- `naTela` (`ItemNaLista`): para cada item, rótulos da variante e da quantidade, preços nos mercados, a cotação que
  vale no mercado atual, quantas foram cotadas ali, a dica do histórico (`referenciaNoMercado`), a marca a mostrar, o
  preço por unidade, se pede "qual marca?" e a diferença para o menor (`diferencaParaOMenor`).
- `totais`: itens, pendentes, comprados, total e itens com preço no mercado atual, valor do carrinho e itens do
  carrinho sem preço.
- `sugestoes = sugerirCompras(compras, hoje, { ignorar, tamanho })`, com o tamanho de cada variante e ignorando o que já está na lista e os produtos eventuais.

### Ações principais

| Ação                         | O que faz                                                                         |
|------------------------------|-----------------------------------------------------------------------------------|
| `adicionarRapido`            | Acha o produto pelo id ou pelo nome, recusa repetido, usa o hábito e insere       |
| `adicionarSugestoes`         | Insere os produtos sugeridos, em ordem                                            |
| `definirPreco`               | Cai na cotação única ou na que vale; sem cotação, cria uma com a variante padrão  |
| `definirVarianteCotacao`     | Troca a marca vista numa cotação                                                  |
| `salvarItem`                 | Valida, grava o item e sincroniza as cotações do painel (cria, troca, apaga)      |
| `alternarComprado`           | Põe/tira do carrinho; sem preço no mercado atual, usa o último do histórico lá    |
| `remover`                    | Apaga o item e as cotações dele; "Desfazer" reinsere os dois                      |
| `escolherMercadoAtual`       | Marca/desmarca o mercado atual e o inclui na comparação, se preciso               |
| `alternarMercado`            | Põe ou tira o mercado da comparação (tirar apaga as cotações dele)                |
| `registrarPrecosNoHistorico` | Leva ao histórico as cotações que ainda não estão lá                              |
| `apagarPrecos`, `limparComprados`, `esvaziarLista` | Limpezas do menu, com confirmação                           |
| `lerCodigo`                  | Acha a variante pelo código e devolve o item (criando, se preciso)                |
| `iniciarFechamento`          | Valida o carrinho, leva a pesquisa ao histórico e monta o rascunho                |
| `registrarCompra`            | Grava pendências, `registrarLancamento` + `deleteItensComprados` numa transação   |

### Preços para o histórico (`selecionarPrecosParaHistorico`)

Cada cotação vai para a variante anotada nela ou, num produto com uma variante só, para essa única. A variante do item
não conta: ela diz o que o usuário quer levar, não a marca que estava na gôndola. Item sem produto ou sem marca fica
de fora (e é contado em "sem marca"). A data é a hora em que a cotação foi anotada. O mesmo preço da mesma variante no
mesmo mercado e no mesmo dia não entra de novo, então finalizar duas vezes não duplica. A gravação usa
`registrarPrecoVariante` (atualiza o preço da variante e insere em `historico_preco`), tudo em `emTransacao`.

## Models e tabelas

| Função                                                     | Módulo                 | Tabelas                                   |
|------------------------------------------------------------|------------------------|-------------------------------------------|
| `listItensListaCompras`, `insertItensListaCompras`, `updateItemListaCompras`, `deleteItemListaCompras`, `deleteItensComprados`, `deleteTodosItensListaCompras` | `listaCompras.ts` | `lista_compras_itens` |
| `listCotacoesDaLista`, `salvarCotacao` (upsert pelo id), `deleteCotacao`, `deleteTodasCotacoesDaLista` | `listaCompras.ts` | `lista_compras_precos` |
| `listMercadosDaLista`, `adicionarMercadoNaLista`, `removerMercadoDaLista` | `listaCompras.ts` | `lista_compras_mercados`, `lista_compras_precos` |
| `getMercadoAtualDaLista`, `saveMercadoAtualDaLista`         | `listaCompras.ts`      | `settings` (`lista_compras_mercado`)      |
| `listComprasDeProdutos`                                    | `listaCompras.ts`      | `itens_transacao`, `transacoes`           |
| `listHistoricoPreco`                                       | `historicoPreco.ts`    | `historico_preco`                         |
| `registrarPrecoVariante`                                   | `produtoVariantes.ts`  | `produto_variantes`, `historico_preco`    |
| `registrarLancamento`                                      | `lancamentos.ts`       | ver [Home](Home.md)                       |
| `listProdutos`, `listProdutoVariantes`, `listMarcas`, `listEmpresas`, `listCategoriasLancamento`, `getLocalPadrao` | vários | cadastros e `settings` |

Chaves estrangeiras que importam aqui: apagar o item apaga as cotações dele; apagar o produto tira o item da lista;
apagar a variante só desvincula (item e cotações ficam sem marca); apagar a empresa tira o mercado e as cotações dele.

Utilitários: `compararLista` (`utils/comparativoLista.ts`), `compararCotacoes`, `empataComAMelhor`,
`percentualAcimaDaMelhor` e `diferencaParaOMenor` (`utils/cotacoesLista.ts`), `precoDoItem` (`utils/comparativoMercados.ts`),
`sugerirCompras` (`utils/sugestoesCompra.ts`), `selecionarPrecosParaHistorico` e `unicaVarianteDoProduto`
(`utils/precosParaHistorico.ts`), `precoPorUnidadePrimaria`, `medidaPorUnidadePrimaria`, `ehGranel`, `medidaGranel`, `rotuloVariante` e
`rotuloQuantidade` (`utils/variantes.ts`), `correspondeBusca` e `normalizarTexto` (`utils/busca.ts`).

## Regras de cálculo

- **Total por mercado:** soma de preço que vale × quantidade de cada item com preço lá.
- **Itens em comum:** itens com preço em todos os mercados (só com 2 mercados ou mais). O "Mais barato" sai do total
  desses itens, porque os totais completos variam com quantos itens cada mercado tem anotados. Se todos empatam,
  ninguém é destacado.
- **Vantagem:** o segundo menor total em comum menos o menor.
- **Dividindo:** comprar cada item em comum no mercado em que ele é mais barato (no empate, fica no mais barato no
  geral, para não inventar uma parada a mais). Só aparece quando economiza mais de meio centavo e usa mais de um
  mercado. A escolha pode ser por unidade, mas o total usa o preço cheio do mercado escolhido.
- **Menor preço do item entre mercados:** por unidade quando todos os mercados do item têm preço por unidade na mesma
  sigla; senão pelo preço cheio.
- **Sugestões (`sugerirCompras`):** precisa de compras em 2 dias diferentes ou mais (compras no mesmo dia somam). O
  ritmo é uma taxa de consumo: o que foi comprado antes da última compra ÷ dias entre a primeira e a última compra. A
  duração esperada da última compra é a quantidade dela ÷ essa taxa (3 a cada 15 dias = 0,2/dia; 15 unidades duram 75
  dias). As quantidades são convertidas pelo tamanho da variante (`medidaPorUnidadePrimaria`: 500 g = 0,5 kg, caixa
  com 12 = 12 un, granel = o peso lançado); se alguma compra do produto não tem medida cadastrada, ou as medidas são de
  grupos diferentes (kg e un), o produto inteiro é contado em unidades compradas. Sai da rotina quem não é comprado há
  mais de 3 durações ou 90 dias (o que for maior). "Na hora" a partir de 80% da duração. Ordem: os da hora, do mais
  atrasado ao menos; depois os mais frequentes. Limite de 12. A quantidade sugerida continua sendo a mais comum por
  compra, em unidades.
- Diferenças abaixo de meio centavo são tratadas como arredondamento em toda comparação.

## Validações e mensagens

| Situação                                  | Mensagem                                                           |
|-------------------------------------------|--------------------------------------------------------------------|
| Item sem descrição                        | "Informe o item ou escolha um produto"                             |
| Quantidade zero                           | "A quantidade deve ser maior que zero"                             |
| Produto pendente já na lista              | Aviso "X já está na lista"                                         |
| Código desconhecido                       | "Nenhuma variante cadastrada com o código ..."                     |
| Falha ao gravar                           | "Não foi possível salvar a alteração na lista" (e relê o banco)    |
| Falha ao carregar                         | "Não foi possível carregar a lista de compras"                     |
| Falha ao levar a pesquisa ao histórico    | "Não foi possível salvar os preços da pesquisa no histórico"       |
| Finalizar sem carrinho, sem mercado ou sem preço | Ver "Rodapé e fechamento"                                   |

## Testes

- `src/models/listaCompras.test.ts`: ordem dos itens, carrinho, chaves estrangeiras, mercado atual, cotações por
  mercado, `registrarLancamento` com histórico, migrações 010, 011 e 016.
- `src/utils/comparativoLista.test.ts`, `cotacoesLista.test.ts`, `sugestoesCompra.test.ts`,
  `precosParaHistorico.test.ts`, `comparativoMercados.test.ts`, `variantes.test.ts` e `unidades.test.ts`.

## Observações

- É a tela mais complexa do app: o hook `useListaCompras.ts` concentra quase toda a regra.
- A migration 016 não criou índice único em (item, mercado, variante): é a tela que evita repetir a variante no mesmo
  mercado (o painel só oferece as variantes ainda não cotadas ali).
