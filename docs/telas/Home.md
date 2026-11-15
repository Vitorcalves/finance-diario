# Home (Finance Diário)

Aba **Início** · rota `HomeMain` (primeira da pilha `HomeStack`) · pasta `src/views/Home` · título "Finance Diário"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

É a tela inicial do app. Mostra o saldo do caixa, o resumo do mês (gasto, média por dia, projeção e o que ainda vai
vencer), as reservas, os atalhos das telas usadas no mercado e o feed de lançamentos agrupado por dia. O botão (+) abre
o formulário de novo lançamento, o mesmo que a Lista de compras e as Notas para lançar abrem já preenchido. O atalho
Cupom lê o QR Code do cupom fiscal (NFC-e de MG) e abre esse formulário com a nota já lançada nele.

## Navegação

- **Entrada:** é a rota inicial do app (`initialRouteName="Home"`). Tocar de novo na aba Início, já selecionada, volta
  para cá.
- **Saídas:**
  - Lupa do header e "Ver todos" → `BuscaLancamentos`, na mesma pilha, sem filtros.
  - Atalho **Lista** → `ListaCompras`; atalho **Notas** → `NotasLancamento`.
  - Atalho **Cupom** → câmera (`ScannerCodigoBarras` no modo `qr`) e consulta da nota (`ConsultaNfce`), dois modais
    de tela cheia sem rota própria; ver "Cupom fiscal (NFC-e)" abaixo.
  - Atalho **Orçamento** → aba Análises, `Orcamento`, com `initial: false` (o hub `DashboardHome` fica embaixo e o
    voltar leva a ele).
- Os atalhos **Assinaturas** (`Menu › Planos`) e **Preços** (`Análises › HistoricoPrecos`) estão comentados em
  `index.tsx`: hoje a linha de atalhos tem quatro botões (Lista, Cupom, Notas e Orçamento).

## Funcionalidades

### Cartão de saldo (`ResumoTotais`)

- **Saldo atual:** soma do saldo das contas do tipo caixa ativas, contando só o que já aconteceu até hoje. É o mesmo
  número que a tela Contas mostra para os caixas.
- **Gasto no mês** e **Média por dia** (gasto realizado dividido pelos dias já vividos do mês).
- **Barra da projeção**, só quando a projeção é maior que zero: um segmento com o gasto realizado, outro com o
  comprometido (parcelas e assinaturas que ainda vão vencer no mês), sobre a projeção de fechamento. Texto:
  "Projeção do mês: R$ X · R$ Y a vencer".
- **Cartão Reservas**, só com reserva ativa: total das reservas e uma linha por reserva com saldo, meta ("R$ 300 de
  R$ 1.000") e barra de progresso. A fração (`progressoDaMeta`) e a cor (`corDaConta`) são as mesmas do cartão da
  reserva na tela Contas.
- O fundo em gradiente é um SVG desenhado com o tamanho medido do cartão (`onLayout`).

### Atalhos rápidos (`AtalhosRapidos`)

Linha de botões iguais (ícone + rótulo), cada um com vibração curta no toque. A lista de atalhos vem pronta da tela
(`index.tsx`); o componente só desenha.

### Cupom fiscal (NFC-e)

Atalho **Cupom** (`qr-code-outline`). O fluxo fica em `useCupomFiscal.ts`; a tela só monta os modais.

1. **Câmera:** `ScannerCodigoBarras` com `modo="qr"` (lê só QR Code, moldura quadrada, "Aponte para o QR Code do
   cupom"). O texto lido passa por `lerQrCodeNfce` (`src/utils/chaveNfce.ts`): pega o parâmetro `p` da URL, valida a
   chave de 44 caracteres (formato e dígito verificador) e só aceita NFC-e (modelo 65) de produção (ambiente 1) de
   Minas Gerais (UF 31), nas versões 2 e 3 do QR Code. O resto volta num alerta "QR Code não reconhecido" com o
   motivo.
2. **Nota repetida:** `buscarLancamentoDaNota(chave)`. Se a chave já está num lançamento, o alerta "Nota já lançada"
   diz "Esta nota já foi lançada em 14/11 (R$ 152,30)." com "Cancelar" e "Lançar de novo".
3. **Consulta** (`src/components/ConsultaNfce.tsx`): modal de tela cheia "Consulta da nota", com o número e a série no
   subtítulo, a faixa "Passe pela verificação e toque em Visualizar. O app lê a nota em seguida." e a WebView da
   consulta oficial (`urlConsultaMg`). O usuário passa pela verificação (Cloudflare Turnstile) e toca em Visualizar;
   o app não mexe no widget nem clica em nada.
   - A WebView só carrega a URL montada a partir do QR Code validado (nunca o texto cru) e só navega em
     `portalsped.fazenda.mg.gov.br`, `challenges.cloudflare.com`, `about:blank` e `about:srcdoc`
     (`urlPermitidaNaConsulta`). `originWhitelist={['*']}` deixa tudo passar por esse filtro: com a lista padrão da
     biblioteca, um endereço fora dela seria aberto em outro app. `setSupportMultipleWindows={false}` faz um link
     de nova janela passar pelo mesmo filtro. Sem `incognito`, sem `userAgent` próprio e sem limpar cookies: o
     Turnstile pode falhar com isso.
   - Um script injetado em cada página do frame principal confere o endereço e manda o HTML ao app por
     `postMessage`; um `MutationObserver` reenvia quando a página muda (no máximo a cada 400 ms e só se o HTML
     mudou). O `onMessage` aceita só mensagem vinda de página da SEFAZ-MG e entrega o HTML a
     `interpretarPaginaNfceMg` (`src/utils/paginaNfceMg.ts`).
   - O HTML fica só na memória: não vai para o banco nem para o console (pode trazer o CPF do comprador).
   - Estados: carregando ("Abrindo a consulta da SEFAZ..."); sem internet (`renderError`, com "Tentar de novo");
     erro HTTP, nota não encontrada ("A SEFAZ respondeu: ...") e página de outra nota, na faixa, com "Recomeçar"
     (a WebView nasce de novo na URL do QR Code). O botão **Lançar sem os itens** fica sempre no rodapé.
   - Só em desenvolvimento (`__DEV__`): botão **HTML**, que grava a última página num arquivo do cache e abre o
     compartilhamento, para guardar páginas reais em `tests/fixtures/nfce/`. O arquivo é apagado ao fechar a
     consulta.
   - Num build feito antes do `react-native-webview`, a consulta mostra "A consulta da nota aparece depois de gerar
     o app de novo" com "Lançar sem os itens": a biblioteca é carregada sob demanda, porque o `import` direto
     derrubaria o app.
4. **Empresa:** pelo CNPJ da chave, comparado sem pontuação e em maiúsculas (o CNPJ novo tem letras); senão, uma
   empresa com a mesma raiz (8 primeiros caracteres: outra filial). Sem nenhuma, abre o painel **Empresa da nota**
   (`EmpresaDaNotaSheet`), porque a nota traz a razão social e a loja costuma estar cadastrada com o nome comercial
   e sem CNPJ:
   - No topo, o que a nota diz da loja: a razão social, o outro nome do cabeçalho da página quando ele é diferente
     ("Também aparece como ..."), o CNPJ e o endereço.
   - **Já está cadastrada?** Busca pelo nome ou CNPJ. Sem busca, a lista mostra as **Parecidas com a nota** (o mesmo
     nome primeiro, depois as que dividem palavras com os nomes da nota, sem contar "ltda", "comércio",
     "supermercado"...; `empresasParecidas`) e as empresas **Sem CNPJ**, as candidatas mais prováveis. As que já têm
     CNPJ aparecem ao buscar. Tocar numa empresa a escolhe: sem CNPJ, o CNPJ da nota é gravado nela
     (`updateEmpresa`, formatado) e as próximas notas da loja já vêm com a empresa. Com outro CNPJ, o alerta
     "Empresa com outro CNPJ" oferece "Cancelar" (volta ao painel), "Só nesta nota" (usa sem gravar) e "Trocar
     CNPJ".
   - **Ou cadastre uma nova:** o campo já vem com a razão social (com o CNPJ no fim se outra empresa já usa o nome,
     `nomeParaCadastro`) e pode ser trocado pelo nome comercial; "Cadastrar com o CNPJ da nota" grava a empresa
     (`insertEmpresa`). Nome repetido aparece embaixo do campo, com o painel ainda aberto.
   - **Seguir sem empresa** (ou fechar o painel): o formulário abre sem empresa, e dá para escolher nele.
   - No "Lançar sem os itens" a página não foi lida: o painel mostra só o CNPJ, e o nome para cadastrar começa vazio.
5. **Rascunho** (`rascunhoDaNotaFiscal`, em `src/utils/rascunhoDaNotaFiscal.ts`): saída, descrição com o nome da
   empresa (ou do emitente), data de emissão, categoria sugerida pela empresa, conta padrão (pago só no crédito e com
   um cartão só cadastrado, o cartão), a chave da nota e um item por linha da nota. A Home guarda o rascunho e troca a
   `key` do formulário, como as Notas para lançar.
   - Cada item leva a descrição como veio, a quantidade e o preço unitário pago: o desconto da nota é rateado entre
     os itens na proporção do valor de cada um, sem perder centavo (`ratearDesconto`), e o total fecha com o valor
     pago. A página de MG não traz o valor unitário: ele sai do total da linha dividido pela quantidade, sem
     arredondar.
   - O item já vem ligado ao produto quando a loja tem de-para para ele (`nfce_itens_variantes`) ou quando o código
     da nota, com cara de código de barras (GTIN de 8, 12, 13 ou 14 dígitos), é o `codigo_barras` de uma variante
     ativa. De-para que aponta para cadastro excluído é ignorado.
   - Item sem valor fica de fora, com aviso; o que não fechou na leitura (soma dos itens, valor pago, item que não se
     leu) vai em `avisos` e aparece no topo do formulário. Nada vira valor inventado.
6. **Lançar sem os itens:** `rascunhoDaChave`, só com a empresa (achada pelo CNPJ ou escolhida no painel), a chave
   e, na nota em contingência, o dia e o valor que o QR Code traz.

O (+) continua reabrindo o que ficou digitado no formulário; depois de um cupom, ele abre um formulário novo, sem os
dados da nota.

### Lista de lançamentos (`ListaLancamentos`)

- Mostra até 50 lançamentos com data até o fim do mês corrente, do mais recente para o mais antigo: gastos, entradas,
  compras no cartão, transferências e pagamentos de fatura. O registro da compra parcelada (parcela 0) não aparece.
- Agrupa por dia (`CabecalhoDia`): "Hoje", "Ontem", "Amanhã" ou "Qui, 24 set" (com o ano quando não é o atual), e o
  total do dia com sinal (verde quando positivo). Dia futuro ganha " · a vencer".
- Cada linha (`TransacaoItem`):
  - Avatar: ícone e cor da categoria; sem categoria, ícone de repetição (parcela/assinatura), seta para baixo
    (entrada), inicial da empresa ou seta para cima.
  - Descrição, selo "A vencer" (data futura), linha "categoria · empresa · N itens", etiquetas das tags e o valor
    (verde nas entradas).
  - Com itens, tocar na linha abre a lista "2× Arroz 5kg  R$ 43,90" (com animação). A compra parcelada mostra os itens
    na 1ª parcela.
- Arrastar a linha para a esquerda (`SwipeableRow`) mostra três ações:
  - **Categoria:** painel (`OpcoesSheet`) com as categorias do tipo do lançamento (saída ou entrada) e "Sem categoria".
  - **Tags:** só em gasto e entrada (natureza `movimento` ou `compra_cartao`); abre o `TagsLancamentoSheet`.
  - **Excluir:** apaga na hora, sem perguntar, e mostra o aviso com "Desfazer".
- Em parcela ou assinatura, categoria e tags valem para o plano inteiro; o aviso diz "aplicada a todas as parcelas".
- Puxar para baixo atualiza (`RefreshControl`). Sem lançamentos: "Nenhum lançamento ainda" com a dica do +.
- O cabeçalho da lista (cartão de saldo, atalhos e o título "Lançamentos" com "Ver todos") vai como
  `ListHeaderComponent`, então rola junto com o feed.

### Novo lançamento (`NovoLancamentoForm`)

Painel inferior (`BottomSheet`) "Novo lançamento", aberto pelo botão flutuante (`Fab`).

- **Tipo:** Saída, Entrada ou Transferência (`SegmentedControl`). Trocar o tipo limpa a categoria se ela for do outro
  tipo.
- **Cupom fiscal:** com o rascunho de uma nota, um cartão no topo diz "Lido do cupom fiscal" ou, quando a leitura
  deixou avisos, "Confira a nota antes de lançar" com a lista deles. Não aparece na transferência.
- **Valor:** campo grande com centavos (`BrazilianIntegerInput`, 2 casas), em vermelho na saída e verde na entrada.
  Com itens, o campo vira "Soma de N itens" e o valor passa a ser a soma deles: cada linha arredondada ao centavo,
  como no cupom (0,750 kg x R$ 8,90 dá R$ 6,68), somada em centavos.
- **Conta:** chips com as contas caixa e cartão ativas; o padrão é a primeira caixa. Num cartão, a etiqueta mostra
  "Cai na fatura de DD/MM (vence DD/MM)", recalculada ao mudar a data; parcelado, "1ª parcela cai na fatura de ...".
- **Transferência:** troca a conta por "De (origem)" e "Para (destino)"; o destino não lista a origem. Some categoria,
  empresa, tags, itens e parcelamento.
- **Categoria:** `SeletorCategoria` com as categorias do tipo. Ao escolher a empresa, o formulário sugere uma
  categoria, desde que o usuário ainda não tenha escolhido uma: se a empresa tem categorias vinculadas no cadastro
  ([Empresas](Empresas.md)), a usada por último entre elas ou a única; sem vínculo, a do último lançamento na empresa.
- **Descrição:** opcional quando há itens (usa a do 1º item) e na transferência ("Transferência entre contas").
- **Data:** chips Hoje / Ontem e campo DD/MM/AAAA (`BrazilianDateInput`).
- **Empresa:** `SeletorMultiplo` de escolha única, com busca, em ordem alfabética. Com uma categoria escolhida, lista
  só as empresas vinculadas a ela e as que não têm categoria nenhuma, com o aviso "Mostrando as empresas de X. Digite
  para buscar em todas."; as outras voltam ao digitar o nome.
- **Tags:** `SeletorMultiplo` de várias escolhas; "Nova tag" cria a tag na hora (`NomeSimplesForm`) e já a marca.
- **Itens:** cartões dos itens (`LancamentoItemCard`, com editar e remover) e "Adicionar item", que abre o
  `LancamentoItemForm` dentro do painel.
- **Compra parcelada:** só na saída (`ParcelamentoSelector`).
- O botão de salvar muda de texto: "Parcelar em Nx", "Transferir", "Adicionar saída" ou "Adicionar entrada".
- Ao salvar com sucesso: limpa o formulário, fecha e mostra o aviso ("Saída de R$ X registrada", "Compra parcelada em
  Nx registrada", "Transferência de R$ X registrada" ou a `mensagemSucesso` recebida).
- **Rascunho:** a prop `rascunho` (`RascunhoLancamento`) abre o formulário preenchido (tipo, descrição, valor, data,
  conta, parcelas, empresa, categoria, itens, chave da NFC-e e avisos). Ela é lida só na montagem; quem usa troca a
  `key` do formulário para aplicar outro rascunho. A Home usa no cupom fiscal; a Lista de compras e as Notas para
  lançar também usam. A chave da nota vai junto no lançamento salvo (menos na transferência).

### Item do lançamento (`LancamentoItemForm`)

- **Produto:** `SeletorMultiplo` com busca; produto de compra eventual só aparece quando buscado. Ao lado, o botão de
  código de barras abre o `ScannerCodigoBarras` e escolhe a variante pelo `codigo_barras`.
- **Variante:** chips "Marca 1 kg • R$ 9,90" das variantes do produto.
- Escolher o produto preenche a descrição e o preço do produto; escolher a variante preenche "Produto - Marca 1 kg" e
  o preço da variante.
- **A granel** (unidade granel na variante): a quantidade aceita 3 casas ("Quantidade (kg)"), o preço vira "Preço por
  kg" e aparece a prévia "0,750 kg x R$ 8,90 = R$ 6,68". Trocar entre variante de pacote e de granel limpa o peso ou
  volta para 1 pacote.
- O cartão do item avisa "Sem variante selecionada" quando há produto sem variante (o preço não vai para o
  histórico).
- **Item da nota fiscal** (`itemNota`: código, descrição e unidade como vieram na nota):
  - O formulário mostra "Da nota: QUEIJO TIROLEZ PARMESAO KG (código 3875)" e explica que, ligado a um produto, o
    item já vem ligado na próxima nota da loja.
  - Escolher produto ou variante (inclusive pelo código de barras) só liga o item: o preço e a quantidade continuam
    os da nota.
  - Em peso, volume ou medida (KG, L, M...) ou com quantidade quebrada, a quantidade aceita 3 casas mesmo sem
    variante a granel ("Quantidade (kg)", "Preço por kg") e aparece a prévia "0,196 kg x R$ 119,90 = R$ 23,50". O
    cartão mostra "0,196 kg" e, sem produto ligado, "Da nota, sem produto ligado".
  - O preço do campo tem 2 casas, mas o da nota tem mais (o total da linha dividido pelo peso): sem editar o campo,
    salvar devolve o preço original, e o total da linha continua o da nota.
  - Salvar o item mantém o `itemNota`.

### Parcelamento (`ParcelamentoSelector`)

- Chave "Compra parcelada" com a explicação "O valor cheio fica na compra; o caixa recebe uma parcela por mês."
- Contador − / + (de 2 a 72 parcelas) e atalhos 2x, 3x, 4x, 5x, 6x, 10x, 12x, 18x e 24x.
- Prévia "de R$ 33,34" ou "R$ 33,34 e depois R$ 33,33": o rateio (`dividirEmParcelas`) não perde centavo e dá o resto
  às primeiras parcelas.
- Vencimento da 1ª parcela: ao ligar a chave, começa na data da compra.

### Tags do lançamento (`TagsLancamentoSheet`)

- Lista de caixas de marcar com todas as tags (nome e anotação). Várias podem ser marcadas.
- "Nova tag" + Criar: cria a tag e já a deixa marcada. Nome vazio ou repetido mostra o motivo.
- Em parcela ou assinatura, avisa que as tags valem para o plano inteiro.
- Salvar troca as tags do lançamento pelas marcadas (nenhuma marcada tira todas). Avisos: "Tags removidas", "Tags
  aplicadas a todas as parcelas" ou "Tags atualizadas".

## Arquivos

| Arquivo                                 | Papel                                                                          |
|-----------------------------------------|--------------------------------------------------------------------------------|
| `index.tsx`                             | Monta a tela: header com busca, cabeçalho da lista, lista, Fab e formulário    |
| `useHome.ts`                            | Carga dos dados, resumo do mês e ações (lançar, excluir, categoria, tags)      |
| `useCatalogoLancamento.ts`              | Cadastros que o formulário de lançamento usa                                   |
| `useCupomFiscal.ts`                     | Fluxo do atalho Cupom: QR Code, nota repetida, consulta, empresa e rascunho    |
| `types.ts`                              | `NovoLancamento`, `ItemLancamento`, `ItemDaNota`, `RascunhoLancamento`, `TipoLancamento` |
| `components/ResumoTotais.tsx`           | Cartão de saldo, projeção e reservas                                           |
| `components/AtalhosRapidos.tsx`         | Linha de atalhos                                                               |
| `components/ListaLancamentos.tsx`       | Lista por dia com as ações de deslizar; reutilizada pela Busca                 |
| `components/CabecalhoDia.tsx`           | Título e total de cada dia                                                     |
| `components/TransacaoItem.tsx`          | Linha do lançamento, com os itens expansíveis                                  |
| `components/NovoLancamentoForm.tsx`     | Formulário de lançamento; reutilizado pela Lista de compras e pelas Notas      |
| `components/LancamentoItemForm.tsx`     | Mini formulário de um item                                                     |
| `components/LancamentoItemCard.tsx`     | Item já adicionado, com editar e remover                                       |
| `components/ParcelamentoSelector.tsx`   | Chave, contador e prévia do parcelamento                                       |
| `components/TagsLancamentoSheet.tsx`    | Painel de tags de um lançamento                                                |
| `components/EmpresaDaNotaSheet.tsx`     | Painel "Empresa da nota": apontar a loja já cadastrada, cadastrar ou seguir sem |

Árvore da tela:

```
HomeView
├── ScreenHeader (título, data por extenso, lupa)
├── LoadingState (só na 1ª carga)  |  ListaLancamentos
│   ├── cabeçalho: ResumoTotais + AtalhosRapidos + título "Lançamentos"
│   ├── SectionList → CabecalhoDia + SwipeableRow → TransacaoItem
│   ├── OpcoesSheet (categoria)
│   └── TagsLancamentoSheet
├── Fab (+)
├── NovoLancamentoForm (BottomSheet, key trocada a cada cupom)
│   ├── cartão do cupom fiscal (avisos), SegmentedControl, BrazilianIntegerInput, ChipSelector (conta), SeletorCategoria
│   ├── BrazilianDateInput, SeletorMultiplo (empresa), SeletorMultiplo (tags) + NomeSimplesForm
│   ├── LancamentoItemCard*, LancamentoItemForm (SeletorMultiplo, ChipSelector, ScannerCodigoBarras)
│   └── ParcelamentoSelector
├── ScannerCodigoBarras modo "qr" (Modal, só com o atalho Cupom)
├── ConsultaNfce (Modal: faixa, WebView da SEFAZ-MG, "Lançar sem os itens")
└── EmpresaDaNotaSheet (BottomSheet, só quando nenhuma empresa tem o CNPJ da nota)
```

## Lógica

### Carga (`useHome` → `carregarDados`)

1. `materializarPlanos()`: gera as cobranças dos planos ativos (assinaturas e entradas programadas) até o fim do mês
   corrente. É idempotente: rodar de novo não duplica.
2. Dez leituras em paralelo:
   - `listTransacoes(null, null, { ateData: fimMes, incluirComprasCartao: true })`: o feed. Natureza visível, data até
     o fim do mês, `LIMIT 50`. O teto de data impede que um parcelamento de 24x ocupe o feed com cobranças de anos à
     frente.
   - `listTransacoes(inicioMes, fimMes, { fluxoGastos: true })`: o mês inteiro, sem limite, só `movimento` e
     `compra_cartao`. É a base da média e da projeção.
   - `listItensTransacao()` e `listTransacoesCompra()`: itens e registros de compra parcelada (donos dos itens).
   - `listEmpresas({ comExcluidos: true })`, `getLocalPadrao()`, `listCategoriasLancamento()`,
     `listContasComSaldo(hoje)`, `listTags()` e `listTagsPorTransacao()`. As empresas vêm com as excluídas: o
     lançamento antigo continua com o nome da empresa (ver [Base comum](README.md), seção "Exclusão lógica dos
     cadastros"). O formulário de lançamento tem carga própria (`useCatalogoLancamento`) e oferece só empresas,
     produtos e variantes ativos; as marcas ele lê com as excluídas, porque só dão nome às variantes.
3. `projetarMes(transacoesMes, { hoje, situacao: 'corrente', diasDecorridos, diasNoMes })`.
4. Se a tela perdeu o foco durante a carga (`focada.current`), o resultado é descartado.
5. O resumo junta `somarPorTipo(contas)` (caixa disponível e total das reservas), as reservas ativas e a projeção.

A carga roda a cada vez que a tela ganha foco (`useFocusEffect`): um lançamento feito em outra tela, uma assinatura
nova ou um backup importado aparecem sem reiniciar o app. O indicador de carregamento aparece só na primeira carga;
puxar para baixo usa `atualizando`.

Derivados (`useMemo`): `secoes = agruparPorDia(transacoes)`, `itensPorTransacao = agruparItensPorTransacao(itens,
compras, transacoes)` e os mapas id → empresa e id → categoria.

### Ações do hook

| Ação                  | O que chama                                       | Depois            |
|-----------------------|---------------------------------------------------|-------------------|
| `adicionarLancamento` | `registrarLancamento(lancamento, localPadrao)`    | recarrega tudo    |
| `definirCategoria`    | `definirCategoriaTransacao(id, categoriaId)`      | recarrega tudo    |
| `definirTags`         | `definirTagsTransacao(id, tagIds)`                | recarrega tudo    |
| `criarTag`            | `salvarTag({ nome })`                             | só relê as tags   |
| `excluir`             | `excluirTransacao(id)`, devolve o que foi apagado | recarrega tudo    |
| `restaurar`           | `restaurarTransacao(excluida)`                    | recarrega tudo    |

### Formulário (`NovoLancamentoForm`)

- A cada abertura, `useCatalogoLancamento().carregar()` relê empresas, produtos, variantes, marcas, categorias, contas
  caixa e cartão ativas, a última categoria de cada empresa (`ultimaCategoriaPorEmpresa`), as categorias vinculadas a
  cada empresa (`listCategoriasPorEmpresa`) e as tags. Um produto criado agora já aparece.
- `opcoesDeEmpresa` e `sugerirCategoriaDaEmpresa` (`src/utils/empresasPorCategoria.ts`) decidem quais empresas a
  categoria esconde e qual categoria a empresa sugere. A empresa escondida entra no seletor como opção `oculta`, a
  mesma regra do produto eventual: só aparece quando buscada.
- A conta padrão (primeira caixa) é aplicada durante a renderização, uma vez por abertura, quando o catálogo chega.
- `categoriaManual` impede que a sugestão por empresa troque a categoria escolhida pelo usuário.
- `cicloFatura` usa `faturaDaCompra(referência, diaFechamento, diaVencimento)`; a referência é a data da compra ou,
  parcelado, a da 1ª parcela. A tela nunca calcula datas de fatura por conta própria.
- `salvando` bloqueia o segundo toque, que criaria o lançamento em dobro.
- O valor vai com sinal: negativo na saída e na transferência, positivo na entrada.

### Gravação (`registrarLancamento`, em `src/models/lancamentos.ts`)

Tudo roda em `emTransacao`: se um passo falha, nada fica gravado (o aviso diz "Nada foi gravado").

- **Conta:** a escolhida ou, sem ela, `caixa-padrao`.
- **Transferência:** uma linha só, natureza `transferencia`, valor negativo, `conta_id` = origem e `conta_destino_id`
  = destino. Sem itens, empresa, categoria nem tags. Recusa valor zero, destino inexistente ou igual à origem.
- **À vista no caixa:** uma linha `movimento`.
- **À vista no cartão:** `garantirFatura` acha ou cria a fatura do ciclo (`faturaDaCompra`) e a linha vira
  `compra_cartao`, com `fatura_id`. Ela fica fora do caixa até a fatura ser paga.
- **Parcelado (2 ou mais):** `criarCompraParcelada` cria o plano `parcelamento` em `planos_pagamento`, o registro da
  compra (parcela 0, natureza `registro_compra`, valor cheio, data da compra) e todas as parcelas de uma vez
  ("Descrição (1/10)"). Cada parcela é `movimento` no caixa ou `compra_cartao` na fatura do ciclo da própria data.
- **Tags:** `definirTagsTransacao` na transação dos itens; na compra parcelada isso espalha as tags por todas as
  linhas do plano.
- **Itens:** uma linha em `itens_transacao` por item, presa à transação da compra (no parcelado, à parcela 0), com
  `valor` = preço unitário. Item com produto e variante chama `registrarPrecoVariante`: atualiza o preço atual da
  variante e grava uma linha em `historico_preco` com empresa, local e a data com hora.
- **Nota fiscal:** a chave da NFC-e (`chaveNfce`) vai em `transacoes.chave_nfce` da transação dos itens; no
  parcelado, no registro da compra (parcela 0), com o valor cheio e a data da compra. A transferência não leva.
  Cada item que veio da nota (`itemNota`) e saiu ligado a um produto grava ou atualiza o de-para da empresa
  (`gravarDeParaItemNfce`, chave do item = `chaveDoItemNota`), na mesma transação: sem empresa não há de-para.
- **Local:** sai de `getLocalPadrao()` (Menu › Preferências); o formulário não pergunta.

### Exclusão e "Desfazer"

`excluirTransacao` lê a linha, os itens e as tags, apaga itens e transação (as tags caem por `ON DELETE CASCADE`) e
devolve tudo. `restaurarTransacao` regrava com os mesmos ids (a chave da NFC-e volta junto); uma tag apagada enquanto
o aviso estava na tela fica de fora. Excluir uma parcela apaga só aquela linha: o plano continua e, como o `gerado_ate` já passou dela, ela não volta
a ser gerada.

## Models e tabelas

| Função                                       | Módulo                     | Tabelas                                                   |
|----------------------------------------------|----------------------------|-----------------------------------------------------------|
| `materializarPlanos`                         | `materializacaoPlanos.ts`  | `planos_pagamento`, `transacoes`, `faturas`, `transacoes_tags` |
| `listTransacoes`, `listTransacoesCompra`     | `transacoesModel.ts`       | `transacoes`                                              |
| `excluirTransacao`, `restaurarTransacao`     | `transacoesModel.ts`       | `transacoes`, `itens_transacao`, `transacoes_tags`        |
| `registrarLancamento`                        | `lancamentos.ts`           | `transacoes`, `itens_transacao`, `planos_pagamento`, `faturas`, `transacoes_tags`, `produto_variantes`, `historico_preco` |
| `listItensTransacao`                         | `itensTransacao.ts`        | `itens_transacao`                                         |
| `listContasComSaldo`, `somarPorTipo`, `listContasPorTipo` | `contas.ts`   | `contas`, `transacoes`                                    |
| `listCategoriasLancamento`, `definirCategoriaTransacao`, `ultimaCategoriaPorEmpresa` | `categoriasLancamento.ts` | `categorias_lancamento`, `transacoes`, `planos_pagamento` |
| `listTags`, `listTagsPorTransacao`, `salvarTag`, `definirTagsTransacao` | `tags.ts` | `tags`, `transacoes_tags`, `transacoes`                 |
| `listEmpresas`, `listCategoriasPorEmpresa`   | `empresas.ts`              | `empresas`, `empresas_categorias_lancamento`              |
| `listProdutos`, `listProdutoVariantes`, `listMarcas` | `produtos.ts`, `produtoVariantes.ts`, `marcas.ts` | `produtos`, `produto_variantes`, `marcas` |
| `getLocalPadrao`                             | `settingsModel.ts`         | `settings` (chave `local_padrao`)                         |
| `buscarLancamentoDaNota`                     | `transacoesModel.ts`       | `transacoes` (`chave_nfce`)                               |
| `listDeParaItensNfce`, `gravarDeParaItemNfce` | `nfceItensVariantes.ts`   | `nfce_itens_variantes`                                    |
| `getEmpresaById`, `insertEmpresa`, `updateEmpresa` (cupom) | `empresas.ts` | `empresas`, `empresas_categorias_lancamento`             |

O cupom fiscal lê o catálogo na hora (`listEmpresas`, `listCategoriasLancamento`, `ultimaCategoriaPorEmpresa`,
`listCategoriasPorEmpresa`, `listProdutos`, `listProdutoVariantes`, `listDeParaItensNfce` e as contas caixa e cartão
ativas), só com os cadastros ativos.

Utilitários do cupom: `lerQrCodeNfce`, `urlConsultaMg`, `urlPermitidaNaConsulta` e `ehPaginaDaSefazMg`
(`utils/chaveNfce.ts`), `interpretarPaginaNfceMg` (`utils/paginaNfceMg.ts`), `acharEmpresaDaNota`,
`empresasParecidas`, `situacaoDoCnpj`, `nomeParaCadastro`, `rascunhoDaNotaFiscal`, `rascunhoDaChave`,
`ratearDesconto`, `chaveDoItemNota` e `quantidadeFracionada` (`utils/rascunhoDaNotaFiscal.ts`).

Utilitários: `projetarMes` (`utils/projecaoMes.ts`), `agruparPorDia`, `agruparItensPorTransacao`, `faturaDaCompra`
(`utils/cartao.ts`), `dividirEmParcelas` e `parcelasDaCompra` (`utils/parcelas.ts`), `progressoDaMeta` e `corDaConta`
(`utils/contas.ts`), `ehGranel`, `medidaGranel`, `rotuloVariante` e `rotuloQuantidade` (`utils/variantes.ts`),
`formatarDiaRelativo` e `toCurrency` (`utils/format.ts`).

## Regras de cálculo

- **Saldo atual:** caixa e reserva contam só transações com data até hoje; o registro da compra parcelada não pesa.
- **Gasto no mês:** saídas com data até hoje no fluxo de gastos (a compra no cartão conta no mês da compra; pagamento
  de fatura e transferência não contam, para não somar em dobro).
- **Comprometido:** saídas do mês com data depois de hoje (parcelas e assinaturas já geradas).
- **Projeção:** realizado + comprometido + média diária dos gastos avulsos (sem plano) × dias que faltam. Parcelas e
  assinaturas entram pelo valor exato e não inflam a média. A tela Mês usa a mesma função.
- **Itens da compra parcelada:** pertencem à parcela 0, que não aparece; são mostrados na parcela 1.

## Validações e mensagens

| Situação                                      | Mensagem                                                  |
|-----------------------------------------------|-----------------------------------------------------------|
| Transferência sem origem ou destino           | "Escolha a conta de origem e a conta de destino."         |
| Origem igual ao destino                       | "Origem e destino precisam ser contas diferentes."        |
| Sem descrição (e sem item para emprestar)     | "Informe a descrição do lançamento."                      |
| Data inválida                                 | "Informe uma data válida."                                |
| Valor zero e sem itens                        | "Informe o valor ou adicione ao menos um item."           |
| Parcelado com menos de 2 parcelas             | "Uma compra parcelada precisa de ao menos 2 parcelas."    |
| 1ª parcela com data inválida                  | "Informe uma data válida para a 1ª parcela."              |
| Falha ao gravar                               | "Não foi possível salvar o lançamento. Nada foi gravado." |
| Item sem descrição                            | "Informe a descrição do item ou selecione um produto"     |
| Item com quantidade zero                      | "Quantidade do item deve ser maior que zero"              |
| Item a granel sem peso                        | "Informe o peso comprado em kg (ex.: 0,750)" (ou L, m)    |
| Item com preço zero                           | "Preço unitário do item deve ser maior que zero"          |
| Código de barras sem variante                 | "Nenhuma variante cadastrada com o código ..."            |
| Tag vazia, com mais de 40 letras ou repetida  | Motivo do `ValidacaoTagError` ("Já existe a tag ...")     |
| QR Code que não é de NFC-e (ou de NF-e)       | "Este QR Code não é de nota fiscal de consumidor (NFC-e)." |
| Dígito da chave errado                        | "A chave de acesso deste QR Code não confere. Tente ler o cupom de novo." |
| Nota de homologação                           | "Esta é uma nota de teste (homologação): não vale como compra." |
| Nota de outro estado                          | "Por enquanto só notas de Minas Gerais; esta é de SP."    |
| Versão do QR Code desconhecida                | "Versão do QR Code não suportada (1)."                    |
| Cupom já lançado                              | "Esta nota já foi lançada em 14/11 (R$ 152,30)." (Cancelar / Lançar de novo) |
| CNPJ sem empresa                              | Painel "Empresa da nota", subtítulo "Nenhuma empresa cadastrada tem este CNPJ" |
| Empresa escolhida com outro CNPJ              | "X está com o CNPJ ..., e a nota é do ..." (Cancelar / Só nesta nota / Trocar CNPJ) |
| Cadastrar com nome em uso                     | "Já existe a empresa "X". Se for ela, toque nela na lista." (embaixo do campo) |
| Cadastrar sem nome                            | "Informe o nome da loja."                                  |
| Falha ao gravar o CNPJ na empresa             | "Não foi possível gravar o CNPJ. O lançamento segue com a empresa." |
| Falha ao montar o rascunho                    | "Não foi possível preparar o lançamento da nota."          |

Os avisos de validação do formulário de lançamento abrem "Confira o lançamento", vibram (`vibrarAviso`) e não fecham
o painel. No painel de tags o título é "Confira a tag".

## Testes

- `src/models/lancamentos.test.ts`: compra parcelada no cartão (fatura por ciclo, dívida, pagamento).
- `src/models/listaCompras.test.ts`, bloco "registrarLancamento e o historico de compras": itens e preço no histórico,
  tudo ou nada.
- `src/models/materializacaoPlanos.test.ts`: parcelamento, assinatura, cancelamento e salário.
- `src/models/transacoesModel.test.ts`: excluir e restaurar, `emTransacao`, compras no cartão no feed.
- `src/models/tags.test.ts`, `src/models/transferencias.test.ts`, `src/models/naturezaTransacao.test.ts`,
  `src/models/contas.test.ts` e `src/models/categoriasLancamento.test.ts`.
- `src/utils/projecaoMes.test.ts`, `parcelas.test.ts`, `cartao.test.ts` e `format.test.ts`.
- Cupom fiscal: `src/utils/chaveNfce.test.ts` (dígito verificador, QR Code das versões 2 e 3, contingência, outro
  estado, CNPJ com letras, texto que não é nota, filtro de navegação), `src/utils/paginaNfceMg.test.ts` (a página real
  de `tests/fixtures/nfce/` e variações dela: desconto, troco, dois pagamentos, soma que não fecha, item ilegível,
  outra nota; tela da verificação, nota não encontrada e layout desconhecido),
  `src/utils/rascunhoDaNotaFiscal.test.ts` (empresa pelo CNPJ e pela raiz, lojas parecidas, CNPJ da loja escolhida,
  nome para cadastrar, rateio do desconto, de-para, código de barras, conta do pagamento) e
  `src/models/notaFiscal.test.ts` (migration 021, chave no lançamento e no parcelado, "Desfazer", de-para, tudo ou
  nada, backup antigo sem a coluna).

## Observações

- Os atalhos Assinaturas e Preços estão comentados no código; o Relatório de telas ainda os lista.
- `ehFuturo(data)` fica em `useHome.ts` e é usado pela linha e pelo cabeçalho do dia para marcar "a vencer".
- O feed corta em 50 linhas: para ver tudo, a Busca de lançamentos não tem limite.
- Cupom fiscal: o layout da página de MG foi lido de uma página salva do navegador (Ctrl+S). Falta conferir no
  aparelho que o Turnstile passa dentro da WebView do Android e que o HTML que chega ao app é o mesmo. Desconto,
  troco, mais de um pagamento e "nota não encontrada" foram escritos sem página real desses casos: o leitor procura os
  rótulos ("Descontos R$", "Valor a pagar R$", "Troco R$") e as caixas de erro do PrimeFaces, e vale guardar essas
  páginas em `tests/fixtures/nfce/` quando aparecerem (botão HTML, só em desenvolvimento).
- A nota repetida é procurada pela chave nos lançamentos gravados: excluir o lançamento tira o aviso, e o "Desfazer"
  devolve a chave junto. Excluir as parcelas de uma compra parcelada deixa o registro da compra (parcela 0) com a
  chave: a nota continua "já lançada".
