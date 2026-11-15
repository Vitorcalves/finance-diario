# Tarefas — Finance Diário

## Prioridades

Em ordem: a primeira tarefa não concluída é a próxima a fazer.

- [x] **1. Backup antes das migrations:** fazer uma cópia automática antes de aplicar migrations pendentes
  (`initializeDatabase`, em `src/models/database.ts`). A função `exportarBanco()` já existe em `src/models/backup.ts`;
  falta gravar o JSON num arquivo e guardar as últimas 5 cópias. Feito em `src/models/backupAutomatico.ts`: as cópias
  ficam em `backups/`, na pasta de documentos do app; se a cópia falhar, as migrations não rodam. Integração › Importar
  lista as cópias e restaura qualquer uma.
- [x] **2. Backup ao recriar o banco:** fazer o "Recriar banco" (Menu › Zona de perigo) exportar um backup antes de
  apagar. Hoje ele só pede isso no alerta. Feito: `recriarBancoComBackup()`, em `src/models/backupAutomatico.ts`, grava
  a cópia (no mesmo rodízio das 5) e só então recria; se a cópia falhar, nada é apagado.
    - [x] **Extra, backup manual:** botão "Criar backup no app" em Integração › Exportar, que grava uma cópia na hora
      (no
      mesmo rodízio das 5).
- [x] **3. Bloco de notas de lançamentos:** um bloco de notas para anotar rápido, por texto ou voz, o que ainda falta
  lançar ("almoço 35 ontem no cartão") e lançar depois, quando tiver tempo. Na hora de lançar, a IA pode transformar a
  nota num `RascunhoLancamento`, que o `NovoLancamentoForm` já sabe abrir (a Lista de compras usa isso). Feito: tela
  Notas para lançar (atalho "Notas" na Home), tabela `notas_lancamento` (migration 017). A voz usa o reconhecedor do
  celular via `expo-speech-recognition` (precisa de novo build nativo). No lugar da IA, um interpretador local por
  regras (`src/utils/interpretarNota.ts`) lê valor, dia, parcelas, entrada, conta, empresa e categoria; o rascunho
  ganhou
  `tipo`, `valor`, `data`, `contaId` e `parcelas`.
- [x] **4. Tags para eventos:** marcar lançamentos com tags como "Viagem julho" ou "Reforma". As tabelas `tags` e
  `transacoes_tags` existem desde a migration 001, mas nenhuma tela usa. Elas respondem "quanto custou a viagem?", coisa
  que a categoria não responde. Feito: tela Tags (Menu › Financeiro › Tags de eventos) com o gasto de cada evento,
  entradas, parcelas a vencer e período; tocar na tag abre a busca filtrada por ela, que ganhou o filtro Tag. O
  lançamento recebe tags no `NovoLancamentoForm` (criando a tag na hora) e arrastando o item na lista (ação "Tags", só
  em gasto e entrada). Parcela e assinatura levam as tags para o plano inteiro, e as cobranças novas herdam. Model em
  `src/models/tags.ts`; a migration 018 impede a mesma tag duas vezes no mesmo lançamento.
- [x] **5. Inflação pessoal:** mostrar quanto a sua cesta de compras de verdade subiu mês a mês, calculado a partir do
  histórico de preços. Feito: tela Inflação pessoal (Análises › Inflação pessoal), com o acumulado de 6 meses, 12
  meses ou tudo, o gráfico mês a mês ou acumulado e a lista do que mais pesou (tocar abre a Análise de preços do
  produto). A conta (`src/utils/inflacaoPessoal.ts`) é um índice encadeado: o item é a variante, o preço do mês é a
  média do histórico (mês sem registro repete o último preço) e o peso é o gasto no item nos últimos 12 meses. Não
  teve migration: só a consulta `listComprasDeVariantes`, em `src/models/dashboard.ts`.
    - [x] **Extra, mês anterior no gráfico do mês:** o "Acumulado" da aba Mês desenha ao fundo a curva do mês anterior
      (`src/views/Mensal/comparativo.ts`), no lugar da linha reta com o total dele.
- [x] **6. Tela de abertura (splash):** desde o Expo 58 o `splash` do `app.json` é ignorado e saiu do schema (o
  expo-doctor acusa). Para manter a `splash-icon.png` em fundo branco, instalar o `expo-splash-screen` e passar a
  configuração para
  o plugin dele; senão, só apagar o bloco. Feito: o bloco saiu e o plugin do `expo-splash-screen` mostra a logo
  (`logo.png`, 128 dp) no fundo do tema (`#f2f5f3` no claro, `#0b1210` no escuro), no lugar da `splash-icon.png`, que
  era só a grade do template do Expo. O `App.tsx` segura o splash até o banco, o tema e a fonte carregarem. Precisa
  de `npx expo prebuild --platform android` e de novo build nativo.
- [x] **7. Excluir produto apaga o histórico:** excluir um produto, ou remover uma variante e salvar o produto, apaga em
  cascata o histórico de preços dele, mas o alerta só pergunta "Deseja excluir?". Avisar no alerta o que vai junto.
  Feito de outro jeito: no lugar de só avisar, a exclusão virou lógica. A migration 020 põe `deleted_at` em `produtos`,
  `produto_variantes`, `marcas`, `categorias` e `empresas`; os `delete...ById` gravam a data em vez de apagar a linha,
  então o histórico de preços, os itens e a empresa dos lançamentos e a marca das variantes continuam. As listagens
  trazem só os ativos e as telas de histórico pedem `{ comExcluidos: true }` (`src/models/exclusaoLogica.ts`; regra em
  [docs/telas](telas/README.md), seção "Exclusão lógica dos cadastros"). Os alertas dos quatro cadastros dizem o que
  sai e o que fica. Não há tela para desfazer uma exclusão.
- [ ] **8. Apagar preço do histórico:** nenhuma tela apaga um registro do histórico de preços. Um preço digitado errado
  (R$
  249,00 no lugar de R$ 24,90) fica para sempre na Análise de preços e vira um salto na Inflação pessoal. O model
  já tem `deleteHistoricoPrecoById`.
- [x] **10. Nomes repetidos nos cadastros:** Marcas, Empresas e Categorias de produto aceitam nomes repetidos (as tags
  já
  recusam, sem diferenciar maiúsculas nem acentos). Duas marcas "Camil" dividem as variantes entre rótulos iguais.
  Comparar só com os ativos: desde a tarefa 7 o cadastro excluído continua no banco (`deleted_at`). Feito: a regra
  fica no model (`src/models/nomeRepetido.ts`; em [docs/telas](telas/README.md), seção "Nome único nos cadastros").
  `insertMarca`, `updateMarca`, `insertCategoria`, `insertEmpresa` e `updateEmpresa` recusam o nome de outro cadastro
  ativo, sem diferenciar maiúsculas, acentos nem espaços sobrando, e as telas (os três cadastros e a criação de marca
  e categoria no formulário de produto) mostram "Já existe a marca "Camil"." no alerta "Nome repetido". O nome de um
  cadastro excluído pode ser usado de novo. Editar sem trocar o nome sempre passa. Não teve migration: os repetidos
  que já existiam continuam no banco, e é preciso renomear ou excluir um deles à mão.
- [ ] **11. Limite mensal por categoria:** definir um limite por categoria de lançamento e, usando a projeção que a tela
  Mês já calcula, avisar algo como "no ritmo atual, Mercado estoura dia 22".

## Ajustes menores

Vindos do [Relatório de telas](<Relatório de telas — Finance Diário.md>) e dos documentos de cada tela
([docs/telas](telas/README.md)), sem ordem definida.

- [x] **Empresas padronizadas:** a lista vinha na ordem de criação e não tinha busca. Feito: ordem alfabética no model
  (`listEmpresas`, vale em todas as telas), busca por nome ou CNPJ e vínculo de cada empresa com várias categorias de
  lançamento (tabela `empresas_categorias_lancamento`, migration 019). No novo lançamento, a categoria escolhida
  lista só as empresas dela, e a empresa sugere a categoria.
- [ ] **Tela órfã:** `src/views/More` não está em nenhuma rota. Remover ou ligar a uma rota.
- [ ] **Erro de digitação:** o estado vazio de Faturas diz "lançe uma compra"; o correto é "lance".
- [ ] **Títulos repetidos:** Categorias de lançamento e Categorias de produto exibem o mesmo título "Categorias"; só o
  subtítulo diferencia.
- [ ] **Telas sem voltar:** Categorias de produto, Marcas, Empresas, Assinaturas e parcelas, Contas e Faturas não
  passam `onBack` ao `ScreenHeader`, então não mostram a seta de voltar; só o voltar do Android funciona. As outras
  telas de pilha têm a seta.
- [ ] **Salário sem caixa:** em Assinaturas e parcelas, no modo "Salário (entrada)", tocar em "Salvar assinatura" sem
  escolher o caixa não faz nada. O `AssinaturaFormModal` retorna antes da validação, e o aviso "Escolha o caixa que
  recebe o salário" do `usePlanos` nunca aparece.
- [ ] **Data do pagamento da fatura:** o `PagarFaturaModal` não valida a data. Com uma data inválida, o campo devolve
  texto vazio e o `pagarFatura` grava o pagamento sem data.
- [ ] **Faturas vazias ao excluir plano:** excluir um parcelamento ou uma assinatura no cartão (`deletePlanoById`) não
  chama o `apagarFaturasVazias`, como o encerrar faz; a fatura fica na lista com total zero.
- [ ] **Código sem uso:** nenhuma tela usa `BlankView`, `getMonthlyIncome`/`saveMonthlyIncome`,
  `contarNotasLancamento` (só o teste dele) nem `deleteHistoricoPrecoById`. Remover ou ligar a uma tela. (O parâmetro
  `produtoId` da rota `AnalisePrecos` saiu desta lista: a Inflação pessoal passou a usar.)

## Sugestões de novas tarefas

Levantadas numa análise do projeto em 15/11/2026 (código, [Relatório de telas](<Relatório de telas — Finance Diário.md>)
e as Observações de [docs/telas](telas/README.md)). Nenhuma está aprovada: a que valer a pena sobe para Prioridades e
ganha número. Dentro de cada grupo, a ordem é a de importância sugerida.

Estado do projeto no dia da análise: `npm run typecheck` passa, `npm test` passa (623 testes) e `npm run lint` acusa
33.643 problemas (S23).

### Dados e segurança

- [ ] **S1. Backup antes de restaurar ou importar:** `confirmarImportacao` e `restaurarBackupAutomatico`
  (`src/views/Integracao/useIntegracao.ts`) chamam `importarBanco` sem guardar o banco atual; só o aviso pede para
  exportar antes. Gravar uma cópia no rodízio de `src/models/backupAutomatico.ts` (motivo novo, "antes de importar") e,
  se a cópia falhar, não importar. É a mesma regra das tarefas 1 e 2.
- [ ] **S2. Tela de erro na abertura:** se `initializeDatabase` falha, o `App.tsx` só escreve no console e o app fica
  no indicador girando para sempre. Isso inclui o caso em que o backup antes das migrations falha (sem a cópia, nenhuma
  migration roda). Mostrar o que deu errado, um "Tentar de novo" e um jeito de compartilhar o último backup salvo.
- [ ] **S3. Backup fora do aparelho:** as 5 cópias ficam na pasta de documentos do app e somem ao desinstalar, trocar
  ou perder o celular. Guardar em `settings` a data do último export ou envio e avisar na Home quando passar de N
  dias; com a API configurada, enviar sozinho (`enviarParaApi`) uma vez por dia ao abrir o app.
- [ ] **S4. Chave da API fora do backup:** `api_token` fica em texto puro em `settings`, e o export lê todas as
  tabelas, então a chave sai no JSON que é salvo em arquivo ou compartilhado como texto. Tirar `api_url` e
  `api_token` do export (`src/models/backup.ts`); guardar no `expo-secure-store` seria o passo seguinte (pede build
  nativo).
- [ ] **S5. Restaurar cadastro excluído:** desde a migration 020 a exclusão é lógica, mas não há tela para desfazer.
  Uma lista dos excluídos (produto, variante, marca, categoria, empresa) com "Restaurar", recusando quando já existe
  um ativo com o mesmo nome (`src/models/nomeRepetido.ts`).

### Lançamentos, contas e cartão

- [ ] **S6. Editar lançamento:** hoje dá para trocar a categoria, as tags ou excluir; não há `UPDATE` de valor, data,
  descrição, empresa nem conta. Um valor digitado errado obriga a excluir e lançar de novo, com todos os itens. Abrir
  o `NovoLancamentoForm` em modo edição (o `RascunhoLancamento` já preenche quase tudo). Começar pelo lançamento
  avulso; no cartão, mudar a data ou a conta precisa trocar a fatura (`garantirFatura` e `apagarFaturasVazias`).
- [ ] **S7. Editar assinatura (reajuste):** não há edição de plano. Quando o streaming aumenta, é preciso encerrar e
  criar outra, e o "Já pago" recomeça do zero. O `updatePlano` já existe: editar valor, descrição e conta valendo só
  para as cobranças que ainda não venceram.
- [ ] **S8. Ajustar saldo da conta:** não há como registrar o rendimento de uma reserva nem acertar a diferença entre
  o caixa e o extrato do banco. O formulário de lançamento só lista caixas e cartões, e a reserva só recebe
  transferência. Ação "Ajustar saldo" no "..." da conta: o usuário informa o saldo real e o app grava a diferença
  como entrada ou saída ("Rendimento", "Ajuste de saldo").
- [ ] **S9. Compras da fatura:** a tela Faturas mostra só o total do ciclo; não dá para conferir com a fatura do
  banco. Tocar na fatura abre a Busca filtrada por ela: filtro `faturaId` novo em `FiltrosBusca` e em
  `FiltrosIniciaisBusca` (a coluna `transacoes.fatura_id` já existe).
- [ ] **S10. Pagar fatura com outro valor:** o `pagarFatura` sempre paga o restante exato. Pagamento parcial e
  pagamento com juros ou multa não cabem. Campo de valor no `PagarFaturaModal`, com o restante como padrão; o que
  passar do restante vira um gasto ("Juros da fatura").
- [ ] **S11. Aporte programado:** os planos fazem cobrança e salário, mas não transferência. O aporte fixo de todo mês
  na reserva tem que ser lançado à mão. Terceiro tipo no `AssinaturaFormModal`, gerando uma `transferencia` por mês.
- [ ] **S12. Assinatura a cada N meses:** o formulário grava sempre `intervalo: 1`, então não existe bimestral,
  trimestral nem semestral. O `ocorrenciasAte` já aceita o intervalo; falta o campo.

### Planejamento e análises

- [ ] **S13. Saldo previsto no fim do mês:** a Home mostra o saldo de hoje e a projeção do gasto, mas nada diz quanto
  vai sobrar no caixa. Conta: saldo atual + entradas programadas a vencer − cobranças no caixa a vencer − faturas que
  vencem no mês. A fatura é o ponto cego de hoje: o pagamento não é plano, então não entra em nenhuma projeção.
  Destacar quando o previsto ficar negativo.
- [ ] **S14. Vencimentos próximos:** o app não lembra de nada. Primeiro passo, sem build nativo: um cartão na Home com
  as faturas e cobranças que vencem nos próximos dias e as faturas vencidas. Segundo passo: notificação local
  (`expo-notifications`, pede build nativo).
- [ ] **S15. Visão do ano:** a aba Mês compara só com o mês anterior. Tela em Análises com gasto, entradas e sobra
  (entradas − saídas) de cada um dos últimos 12 meses e a evolução por categoria. `listTransacoes(início, fim,
  { fluxoGastos: true })` já entrega os dados. Combina com a tarefa 11 (limite por categoria).
- [ ] **S16. Exportar lançamentos em planilha:** a Busca filtra tudo, mas o resultado não sai do app. Botão que gera um
  CSV do que está filtrado e abre o compartilhamento (`expo-sharing` já está instalado).
- [ ] **S17. Orçamento salvo:** o Orçamento não fica no banco; fechar o app perde a pesquisa de preços em andamento,
  ao contrário da Lista de compras. Guardar o rascunho (tabela própria ou um JSON em `settings`).

### Cadastros

- [ ] **S18. Juntar cadastros repetidos:** marcas, empresas e categorias repetidas de antes da regra do nome único
  continuam no banco, e a saída hoje é renomear ou excluir à mão. Ação "Juntar com..." que passa as variantes, os
  lançamentos e o histórico de preços para um dos dois e exclui o outro.
- [ ] **S19. Editar categoria de produto:** a tela só cria e exclui. Corrigir o nome exige excluir e criar de novo, e
  os produtos perdem o vínculo.
- [ ] **S20. Código de barras repetido:** o `ProdutoForm` aceita duas variantes com o mesmo código, e a leitura pela
  câmera usa a primeira que achar. Recusar no model, comparando só com as variantes ativas.
- [ ] **S21. Locais como cadastro:** Muriaé e Viçosa são fixos em `src/utils/local.ts`; uma cidade nova pede mudança
  no código. O formulário de lançamento também não pergunta o local: usa sempre o padrão do Menu, e uma compra na
  outra cidade sai com o local errado se a preferência não for trocada antes.

### Desempenho

- [ ] **S22. Leituras e índices que crescem com o histórico:** a Home (`useHome.ts`) e a Busca
  (`useBuscaLancamentos.ts`) leem todos os itens do banco com `listItensTransacao()` a cada foco; na Home, para
  mostrar no máximo 50 lançamentos. Ler só os itens das transações da tela. Faltam índices: hoje `transacoes` só tem
  índice em `data`, `categoria_id` e (`plano_id`, `parcela_numero`). O saldo por conta, o total de cada fatura e os
  itens por transação varrem a tabela inteira. Migration 021 com índices em `transacoes` (`conta_id`,
  `conta_destino_id`, `fatura_id`), `itens_transacao (transacao_id)` e `historico_preco (variante_id)`.

### Qualidade do projeto

- [ ] **S23. Lint utilizável:** dos 33.643 problemas, 33.543 são `Delete ␍`: os arquivos estão em CRLF
  (`core.autocrlf=true`) e o Prettier espera LF. Resolver com `"endOfLine": "auto"` no `.prettierrc` ou um
  `.gitattributes` com `eol=lf`. O `eslint.config.js` não tem `ignores`, então o ESLint também varre
  `.claude/worktrees/` (38 erros de parsing), `scripts/` e o próprio arquivo de configuração. Em `src/` sobram 4 erros
  de verdade (`sincronizacaoApi.test.ts` e `Mensal/components/GraficoAcumulado.tsx`, linha 59).
- [ ] **S24. Worktree antiga:** `.claude/worktrees/reestruturar-home-lancamento-33f033` ainda está na pasta do projeto
  (branch `claude/reestruturar-home-lancamento-33f033`, parada num commit antigo), e o git a registra em outro caminho
  (`C:/Users/vitor/testes/...`). Conferir se há algo a aproveitar e remover a pasta e a branch.
- [ ] **S25. Lockfile e CI:** o `package-lock.json` está no `.gitignore`; com as versões em `^`, cada instalação pode
  trazer dependências diferentes. Versionar o lockfile e criar um workflow do GitHub Actions com `typecheck`,
  `typecheck:tests`, `lint` e `test` a cada push em `dev`.
- [ ] **S26. Nome e versão do app:** o `app.json` tem `name: "finance-diario"`, e é esse o nome que aparece no celular
  (`app_name` do Android); a versão é 1.0.0, e a do `package.json` é 2.0.0. Trocar para "Finance Diário" e alinhar a
  versão (pede prebuild e build nativo). Não mexer no `package` (`com.anonymous.financediario`): com outro id o
  Android instala um app novo, sem os dados.
- [ ] **S27. Dividir o `useListaCompras.ts`:** 1.446 linhas, o maior arquivo do projeto, com quase toda a regra da
  tela. Passar as regras puras para `src/utils/` (com teste), como já foi feito com `comparativoLista.ts` e
  `cotacoesLista.ts`.
- [ ] **S28. Referências desatualizadas nos docs:** `docs/telas/Mensal.md` e `docs/telas/More.md` citam o limite
  mensal por categoria como "item 6" das Tarefas (é o 11); `docs/telas/Home.md` diz que o Relatório ainda lista os
  atalhos Assinaturas e Preços, mas ele já os dá como comentados.

## Funcionalidades novas (vistas em outros apps de finanças)

Ideias tiradas do que apps como Mobills, Organizze, YNAB, Monarch, Money Lover e Splitwise oferecem e o Finance Diário
ainda não tem, adaptadas ao uso de uma pessoa só (sem conta, login nem nuvem obrigatória). Também não estão aprovadas.
"Pede build nativo" marca as que dependem de um módulo nativo novo (prebuild e build ficam com o usuário).

As que mais combinam com o que o app já faz: F1, F3, F9, F16 e F17.

### Lançar mais rápido

- [ ] **F1. Ler a nota fiscal pelo QR Code:** apontar a câmera para o QR Code do cupom (NFC-e) e abrir o
  `NovoLancamentoForm` já com empresa, data, itens e valor, para só conferir e lançar. Caminho escolhido em
  15/11/2026: a página de consulta da SEFAZ abre numa WebView dentro do app, o usuário passa pela verificação e o app
  lê o HTML. Começar por MG. Pede build nativo a partir da F1.2.
    - **Feito em 15/11/2026 (código e testes):** atalho Cupom na Home → câmera no modo QR → aviso de nota já lançada →
      `ConsultaNfce` → empresa pelo CNPJ (ou apontada/cadastrada no painel "Empresa da nota") → formulário
      preenchido. `react-native-webview` 14.0.1 instalado (`npx expo install`). Falta o que só o aparelho mostra:
      gerar o build (`npm run android`), conferir que o Turnstile passa dentro da WebView e guardar mais páginas
      reais (ver F1.2). Detalhes em [docs/telas/Home.md](telas/Home.md), seção "Cupom fiscal (NFC-e)".
    - **O que a pesquisa de 15/11/2026 mostrou:**
        - A SEFAZ-MG não tem API aberta para o consumidor. Os web services (`nfce.fazenda.mg.gov.br`) são para
          emissores e pedem certificado digital. O Nota Fiscal Mineira só tem app com login e mostra valor e
          categoria, sem os itens.
        - A página do QR Code (`portalsped.fazenda.mg.gov.br/portalnfce/sistema/qrcode.xhtml?p=...`) responde direto,
          mas o formulário traz um Cloudflare Turnstile e só mostra a nota depois da verificação e do botão
          "Visualizar". Um `fetch` do app não passa disso.
        - A Cloudflare documenta o Turnstile em WebView: JavaScript e DOM storage ligados, acesso a
          `challenges.cloudflare.com`, `about:blank` e `about:srcdoc`, o mesmo user agent a sessão toda e cookies
          mantidos.
        - O Expo 58 fixa o `react-native-webview` em 14.0.1. O pacote não tem plugin de configuração: o `app.json`
          não muda.
        - Não verificado: o layout da página da nota (ninguém passou da verificação na pesquisa) e o Turnstile numa
          WebView do Android. A F1.2 tira as duas dúvidas antes de o leitor da página ser escrito.
    - **Regras para todas as etapas:**
        - O app não resolve nem contorna a verificação: não mexe no widget e não clica em "Visualizar". Só lê a
          página que o usuário abriu.
        - A WebView carrega só a URL montada pelo app a partir do QR Code validado, nunca o texto cru dele, e não
          navega para fora da SEFAZ.
        - O HTML fica só na memória: não vai para o banco nem para o console (pode trazer o CPF do comprador).
    - [x] **F1.1 Chave de acesso e QR Code (sem build nativo):** `src/utils/chaveNfce.ts`, com teste. Feito como
      descrito; o erro volta com código e mensagem (`nao_e_nota`, `chave_invalida`, `versao`, `teste`,
      `outro_estado`, este com a sigla da UF). O mesmo arquivo tem o filtro de navegação da WebView
      (`urlPermitidaNaConsulta`, que recusa endereço com usuário ou `\`). Testado com o cupom real de 15/11 e com
      chaves derivadas dele (dígito calculado à parte).
        - `lerQrCodeNfce(texto)` pega o parâmetro `p` da URL e separa por `|`. O 1º campo é a chave, o 2º a versão
          do QR Code (2 ou 3) e o 3º o ambiente. Em nota de contingência (forma de emissão 9), o 4º e o 5º campos
          são o dia da emissão e o valor total, nas duas versões.
        - Chave: 44 caracteres, `^\d{6}[0-9A-Z]{12}\d{26}$` (desde julho de 2026 o CNPJ pode ter letras). Na ordem:
          UF (2), ano e mês (4), CNPJ (14), modelo (2), série (3), número (9), forma de emissão (1), código (8) e
          dígito verificador (1).
        - Dígito verificador: módulo 11 com pesos de 2 a 9 da direita para a esquerda; cada caractere vale o código
          ASCII menos 48; resto 0 ou 1 dá dígito 0. Confere com o exemplo do Manual de Orientação do Contribuinte
          (`5206043300991100250655012000000780026730161`, dígito 5).
        - Só passa modelo 65, ambiente 1 (produção) e UF 31 (MG). O resto volta com o motivo: "não é QR Code de
          nota fiscal", "nota de teste", "por enquanto só notas de Minas Gerais".
        - `urlConsultaMg(p)` monta a URL oficial com `encodeURIComponent(p)`: a assinatura da nota em contingência é
          Base64 e pode ter `+`.
        - `ScannerCodigoBarras` ganha `modo?: 'barras' | 'qr'`: troca os tipos lidos (`['qr']`, que o `expo-camera`
          já aceita), o título, a dica e a moldura (quadrada). O padrão continua o de hoje.
        - Atalho "Cupom" (`qr-code-outline`) no `AtalhosRapidos` da Home. Nesta etapa ele já abre o formulário com o
          que a chave dá: a empresa achada pelo CNPJ (regra na F1.4) e, em nota de contingência, o dia e o valor.
          A Home passa a guardar o `rascunho` e a trocar a `key` do formulário, como a tela Notas para lançar.
        - Testes: chave válida, dígito errado, QR Code das versões 2 e 3, contingência, outro estado, CNPJ com
          letras e texto que não é nota. Usar chaves de cupons de verdade.
    - [ ] **F1.2 Tela de consulta com WebView (pede build nativo):** `src/components/ConsultaNfce.tsx`, modal de tela
      cheia como o scanner. Código feito; falta o "Pronto quando" no aparelho. Diferenças do plano: a WebView é
      carregada sob demanda (o pacote pede o módulo nativo ao ser importado e derrubaria um build antigo); o
      `originWhitelist` é `['*']` (com o padrão, endereço fora da lista abre em outro app, antes do filtro); nova
      janela fica desligada; "Recomeçar" recria a WebView na URL do QR Code; o erro HTTP só aparece na faixa, com a
      página por baixo (um desafio da Cloudflare pode vir com 403 e passar).
        - Instalar com `npx expo install react-native-webview` e gerar um novo build (`npm run android`).
        - `ScreenHeader` "Consulta da nota" com fechar, uma faixa "Passe pela verificação e toque em Visualizar. O
          app lê a nota em seguida." e a WebView por baixo.
        - WebView: `source` com a `urlConsultaMg`, `javaScriptEnabled` e `domStorageEnabled`. O
          `onShouldStartLoadWithRequest` só deixa navegar em `portalsped.fazenda.mg.gov.br`,
          `challenges.cloudflare.com`, `about:blank` e `about:srcdoc` (no Android ele não é chamado na primeira
          carga; por isso a URL inicial é sempre a montada pelo app). Sem `incognito`, sem `userAgent` próprio e
          sem limpar cookies: o Turnstile pode falhar com isso.
        - `injectedJavaScript` (roda a cada página carregada, só no frame principal): confere o `location.hostname`
          e envia `document.documentElement.outerHTML` por `window.ReactNativeWebView.postMessage`. Um
          `MutationObserver` reenvia quando o conteúdo muda, caso a nota chegue por atualização parcial da página.
          O `onMessage` é obrigatório para o script rodar: ele confere o endereço da página, entrega cada HTML ao
          leitor da F1.3 e fecha a tela quando o leitor reconhece a nota.
        - Estados: carregando; sem internet ou erro HTTP (`onError`, `onHttpError`) com "Tentar de novo"; e o botão
          "Lançar sem os itens", sempre à mão, que cai no rascunho da F1.1.
        - Captura para os testes (só em `__DEV__`): botão "Compartilhar HTML", que grava a página num arquivo e abre
          o `expo-sharing`.
        - Pronto quando: no aparelho, a verificação passa dentro da WebView, a nota aparece e o HTML chega ao app.
          Guardar de 3 a 5 páginas reais em `tests/fixtures/nfce/` (itens por peso, desconto, CPF na nota,
          contingência e nota não encontrada, se aparecerem), trocando antes o CPF e o nome do comprador.
    - [x] **F1.3 Leitor da página de MG:** `src/utils/paginaNfceMg.ts`, função pura com teste, escrita a partir de
      páginas reais. Feito com a página salva do navegador (Ctrl+S), em `tests/fixtures/nfce/mg-itens-por-peso.html`.
      A página de MG não traz valor unitário (sai de total ÷ quantidade) e escreve a quantidade e os totais com
      ponto decimal. Tipo a mais: `outra_nota`, quando a chave da página não é a do QR Code. Desconto, troco, dois
      pagamentos e "não encontrada" saíram sem página real: vale guardar essas quando aparecerem.
        - Dá para adiantar sem o build: abrir a URL do QR Code no navegador do computador, passar pela verificação
          e salvar a página (Ctrl+S). A F1.2 confirma depois que o HTML da WebView é o mesmo.
        - `interpretarPaginaNfceMg(html)` devolve `nota`, `verificacao` (ainda na tela do Turnstile),
          `nao_encontrada` (com a mensagem da SEFAZ) ou `desconhecida` (layout que o leitor não reconhece).
        - `NotaFiscalLida`: chave, emitente (nome e CNPJ), data de emissão, número, série, itens (código, descrição,
          quantidade, unidade, valor unitário, valor total), valor dos itens, desconto, valor pago e formas de
          pagamento.
        - Sem biblioteca de DOM (o app não tem e o teste roda em Node): linhas e células saem por expressão
          regular, com limpeza de entidades e espaços; "1.234,56" vira 1234.56.
        - Conferências: se a página mostra a chave, ela tem de ser a do QR Code; itens menos desconto fecham com o
          valor pago (1 centavo de folga); item sem valor unitário usa total ÷ quantidade. O que não fechar volta
          em `avisos`, para a tela mostrar, nunca como valor inventado.
        - Cada página guardada vira um caso de teste. Outro estado entra depois como outro arquivo
          (`paginaNfce<UF>.ts`), escolhido pela UF da chave.
    - [x] **F1.4 Da nota para o rascunho:** `src/utils/rascunhoDaNotaFiscal.ts`, função pura com teste, que recebe a
      nota e o catálogo (empresas, variantes, de-para) e devolve o `RascunhoLancamento`. Feito; o rascunho ganhou
      `chaveNfce` e `avisos` (mostrados no topo do formulário). No lugar do alerta "Cadastrar?", o painel "Empresa da
      nota" (`EmpresaDaNotaSheet`, pedido do usuário em 15/11): a nota traz a razão social e a loja costuma estar
      cadastrada com o nome comercial e sem CNPJ, então dá para apontar a loja já cadastrada (o CNPJ fica gravado
      nela; com outro CNPJ, "Só nesta nota" ou "Trocar CNPJ"), cadastrar uma nova com o nome que quiser ou seguir sem
      empresa. A lista mostra as parecidas com a nota e as sem CNPJ; a página ganhou o endereço do emitente para
      ajudar a reconhecer a loja. O código da nota só é comparado com o `codigo_barras` quando tem cara de GTIN (8,
      12, 13 ou 14 dígitos): o código interno da loja é curto. Para o total fechar, o formulário passou a somar cada
      linha arredondada ao centavo, em centavos (vale para todo lançamento com itens).
        - Empresa: mesmo CNPJ, comparado sem pontuação e em maiúsculas (não usar `\D`, por causa das letras);
          senão, mesma raiz (8 primeiros caracteres: outra filial da mesma empresa). Sem nenhuma, a tela pergunta
          "Cadastrar <emitente> com este CNPJ?" (`insertEmpresa`); se o nome já existe sem CNPJ, oferece gravar o
          CNPJ nela (`updateEmpresa`).
        - Categoria: a sugerida pela empresa (`sugerirCategoriaDaEmpresa`). Data: a de emissão. Descrição: o nome
          da empresa. Conta: a padrão.
        - Itens: um por linha da nota, com a descrição como veio, a quantidade e o preço unitário; já ligados a
          produto e variante quando a F1.5 resolver.
        - Desconto: o formulário soma os itens e ignora `valor` quando há itens, e o preço do item tem de ser maior
          que zero; o desconto não cabe como item negativo. Ratear o desconto entre os itens na proporção do valor
          de cada um, sem perder centavo (a ideia do `dividirEmParcelas`), para o total fechar com o valor pago. O
          preço que vai ao histórico passa a ser o pago. Rever a regra se a página trouxer desconto por item.
        - Home: câmera (F1.1) → consulta (F1.2) → rascunho → `NovoLancamentoForm`.
    - [x] **F1.5 Banco (migration 021): nota repetida e de-para dos itens.** Feito (`src/models/nfceItensVariantes.ts`,
      `buscarLancamentoDaNota` em `transacoesModel.ts`, teste em `src/models/notaFiscal.test.ts`). O `itemNota` leva
      também a unidade da nota: em peso ou volume a quantidade do item aceita 3 casas mesmo sem variante a granel.
      Sem editar o campo de preço, o item mantém o preço exato da nota.
        - `transacoes.chave_nfce` (texto, com índice). A chave sai do rascunho (`chaveNfce`), passa por
          `NovoLancamento` e `DadosLancamento` e é gravada na transação dos itens (na compra parcelada, a do
          registro da compra). O `insertTransacao` passa a gravar a coluna; com isso o "Desfazer" da exclusão
          (`restaurarTransacao`) devolve a chave junto.
        - Ao ler o QR Code, antes de abrir a consulta: se a chave já está num lançamento, alerta "Esta nota já foi
          lançada em 14/11 (R$ 152,30)" com "Lançar de novo" e "Cancelar".
        - Tabela `nfce_itens_variantes`: `empresa_id`, `chave_item`, `produto_id`, `variante_id` e datas, única por
          empresa e `chave_item`. A `chave_item` é o código do item na nota ou, sem código, a descrição passada pelo
          `normalizarTexto`. Vale por empresa porque o código é o do cadastro da loja.
        - Ordem para ligar um item: o de-para da empresa; depois o código da nota igual ao `codigo_barras` de uma
          variante ativa; senão, o item vai sem produto. De-para que aponta para cadastro excluído é ignorado.
        - Aprender: o `ItemLancamento` ganha `itemNota?: { codigo, descricao }`. Ao salvar, cada item que veio da
          nota e saiu ligado a um produto grava ou atualiza o de-para, dentro do `registrarLancamento`.
        - `LancamentoItemForm`: num item que veio da nota, escolher produto ou variante não troca o preço nem a
          quantidade (hoje o `aplicarVariante` põe o preço da variante), e o `salvarItem` do formulário preserva o
          `itemNota`.
        - Backup: o export lê as tabelas do `sqlite_master`, então a tabela e a coluna novas entram sozinhas.
          Testar a importação de um backup antigo, sem a coluna.
    - [ ] **F1.6 Documentação e extras:**
        - [x] Atualizar `docs/telas/Home.md` (atalho, fluxo e item do lançamento), o
          [README das telas](telas/README.md) (migration 021, `ConsultaNfce`, modo do scanner, utilitários novos) e o
          Relatório de telas.
        - Extras, sem ordem: [x] forma de pagamento → conta (crédito com um cartão só já escolhe o cartão,
          `contaDoPagamento`); [ ] outros estados; [ ] digitar a chave quando o QR Code não lê (usa a consulta por
          chave, `consultaarg.xhtml`, que tem a mesma verificação).
- [ ] **F2. Importar extrato do banco (OFX ou CSV):** escolher o arquivo com o `expo-document-picker` (já instalado) e
  abrir uma tela de conferência. Cada linha do extrato fica como "já lançado" (mesmo valor e data próxima na mesma
  conta), "novo" (vira lançamento, com a categoria sugerida pela descrição) ou "ignorar". Guardar o identificador da
  linha (`FITID` do OFX) em `transacoes`, para o mesmo extrato não entrar duas vezes. Serve também para conferir a
  fatura do cartão (S9).
- [ ] **F3. Modelos e duplicar lançamento:** gastos que se repetem sem data certa ("Ônibus R$ 5,50", "Almoço no
  trabalho") viram modelos de um toque. Ação "Duplicar" ao deslizar o lançamento (abre o formulário preenchido, com a
  data de hoje) e "Salvar como modelo"; os modelos aparecem como chips no topo do `NovoLancamentoForm`. O
  `RascunhoLancamento` já carrega tudo o que o modelo precisa guardar.
- [ ] **F4. Autocompletar pela descrição:** ao digitar a descrição, sugerir as já usadas e, ao escolher uma, preencher
  categoria, empresa e o valor da última vez. Hoje só a empresa sugere a categoria; lançamento sem empresa ("Uber",
  "Pix aluguel") começa sempre do zero. Comparar com `normalizarTexto` (`src/utils/busca.ts`).
- [ ] **F5. Somar no campo de valor:** botão "+" ao lado do valor para somar parcelas de uma conta ("35,00 + 12,50")
  sem sair para a calculadora. O `BrazilianIntegerInput` continua igual; a soma fica no formulário.
- [ ] **F6. Atalhos do ícone e widget:** segurar o ícone do app abre "Novo lançamento", "Nota por voz" e "Lista de
  compras" (`expo-quick-actions`); um widget do Android mostra o saldo e o gasto do mês, com um botão "+"
  (`react-native-android-widget`). Pede build nativo.
- [ ] **F7. Capturar a notificação do banco:** apps de finanças leem a notificação "Compra aprovada R$ 35,00 em
  PADARIA X" e criam o lançamento. Aqui ela viraria uma nota em `notas_lancamento`, que o `interpretarNota` já sabe
  ler; o usuário só confere e lança. Caminho mais leve: "Compartilhar com o Finance Diário", para mandar o texto de um
  comprovante de Pix direto para as Notas. Os dois pedem módulo e build nativos.
- [ ] **F8. Comprovante e garantia:** anexar a foto do cupom ou do comprovante ao lançamento (arquivo numa pasta
  `anexos/` do app, tabela nova ligando ao lançamento) e, em compras maiores, o campo "Garantia até", com a lista do
  que ainda está na garantia. Decidir como os anexos entram no backup: o JSON de hoje não leva arquivos.

### Planejar o mês

- [ ] **F9. Contas a pagar com confirmação:** hoje um lançamento ou cobrança com data futura vira gasto sozinho quando
  o dia chega, pago ou não. Nos outros apps a conta fica "pendente" até ser marcada como paga. Opção "confirmar
  pagamento" por assinatura ou lançamento agendado (IPTU, boleto): no dia, a Home pergunta "Pagou?"; sem confirmação,
  a conta fica "Atrasada" e não sai do saldo. Mexe na regra do saldo (`listContasComSaldo`) e na projeção
  (`projetarMes`): é uma tarefa grande.
- [ ] **F10. Quanto posso gastar hoje:** um número só na Home: (entradas do mês − gasto − comprometido − o que foi
  separado para guardar) ÷ dias que faltam. A renda sai das entradas programadas (salário) ou da chave
  `monthly_income`, que já existe em `settings` sem uso. Combina com o saldo previsto (S13) e o limite por categoria
  (tarefa 11).
- [ ] **F11. Objetivo com prazo:** a reserva tem meta de valor (`contas.meta_valor`), mas não tem data. Com uma
  `meta_data`, o cartão da reserva mostra "guarde R$ 380 por mês para chegar em dez/2027" e "no ritmo atual, chega em
  mar/2028", pela média dos aportes (o `totalAportadoNoMes` já existe).
- [ ] **F12. Orçamento do evento:** a tag de evento ganha um teto opcional ("Viagem julho: R$ 3.000"). O `TagCard`
  mostra a barra "R$ 2.100 de R$ 3.000" e o que ainda vai vencer em parcelas. Coluna nova em `tags`.
- [ ] **F13. Regra 50/30/20:** cada categoria de lançamento ganha um grupo (essencial, estilo de vida, futuro). A aba
  Mês mostra quanto da renda foi para cada grupo, contra os 50%, 30% e 20% de referência (percentuais editáveis).
  Coluna nova em `categorias_lancamento`.
- [ ] **F14. Subcategorias:** a categoria é uma lista plana (`categorias_lancamento` não tem pai). Com subcategoria,
  "Transporte" abre em Combustível, Ônibus e Aplicativo; os gráficos somam pela categoria principal e detalham ao
  tocar.
- [ ] **F15. Compras planejadas:** lista de desejos para compras grandes (TV, celular): preço-alvo, reserva de onde
  sai o dinheiro e quanto falta. Se o item for um produto cadastrado, mostrar o menor preço já visto no histórico e
  avisar quando um preço registrado ficar abaixo do alvo.

### Cartão, parcelas e dívidas

- [ ] **F16. Limite do cartão:** campo de limite no cadastro do cartão (`contas`). O `ContaCard` mostra "Disponível
  R$ X de R$ Y", descontando a dívida em aberto com as parcelas futuras (o saldo do cartão já conta assim), e o
  "melhor dia de compra" (o dia seguinte ao fechamento). O formulário avisa quando a compra passa do disponível.
- [ ] **F17. Parcelas nos próximos meses:** gráfico em Assinaturas e parcelas com o comprometido de cada um dos
  próximos 12 meses e o que libera quando cada parcelamento termina ("em mar/2027 acabam 3 parcelas: R$ 420 a menos
  por mês"). Ajuda a decidir se cabe um parcelamento novo. Dados: `listCobrancasDePlanos` e, para as assinaturas,
  `custoMensalEquivalente`.
- [ ] **F18. Antecipar parcelas:** ação "Antecipar" no `PlanoCard`: escolher quantas parcelas quitar agora e o
  desconto recebido. As parcelas futuras escolhidas saem, entra um pagamento com o valor pago e o plano termina mais
  cedo. No cartão, o valor cai na fatura do ciclo atual.
- [ ] **F19. A receber e a pagar (pessoas):** "emprestei R$ 200 ao João", "paguei o jantar, metade é da Ana". Um tipo
  novo de conta para pessoas: emprestar é uma transferência do caixa para "A receber: João", e a devolução é a
  transferência de volta, reaproveitando o que as reservas já usam. No formulário, "Dividir": só a minha parte conta
  como gasto e o resto vai para a receber. O Menu ganha a lista de quem deve e de quanto.

### Análises

- [ ] **F20. Patrimônio ao longo do tempo:** uma linha com caixas + reservas − dívida dos cartões no último dia de
  cada mês. O `listContasComSaldo(data)` já calcula o saldo numa data: basta rodar para os últimos 12 meses.
- [ ] **F21. Fechamento do mês:** na virada do mês, um cartão na Home com o resumo do que fechou: total, diferença
  para o mês anterior, quanto sobrou, a categoria que mais pesou e a que mais subiu, o maior gasto e a inflação
  pessoal do mês. Tudo sai de funções que já existem (`projetarMes`, gasto por categoria, `inflacaoPessoal.ts`).
- [ ] **F22. Alerta de gasto fora do padrão:** comparar cada categoria com a média dela nos 3 meses anteriores, no
  mesmo dia do mês: "Mercado está 35% acima do seu normal". Função pura com teste; aparece no resumo da aba Mês e na
  Home.
- [ ] **F23. Assinaturas detectadas:** achar lançamentos avulsos com a mesma empresa (ou descrição) e valor parecido
  em 3 meses seguidos e oferecer "Criar assinatura?". Na mesma conta, avisar quando a cobrança de uma assinatura
  lançada à mão veio mais cara que a do plano.
- [ ] **F24. Onde mais gasto:** a aba Mês tem gráfico por categoria e por cidade, mas não por empresa. Ranking das
  empresas do mês, com toque para a Busca filtrada (o filtro de empresa já existe), e o gasto médio por dia da
  semana.
- [ ] **F25. Inflação pessoal contra o IPCA:** a tela compara a cesta só com ela mesma. Buscar o IPCA mensal na API
  pública do Banco Central (SGS, série 433; conferir o endereço) e desenhar a linha junto com a da cesta. Guardar a
  série em `settings`: sem internet, a tela continua funcionando só com a cesta.
- [ ] **F26. Rendimento da reserva:** depois do ajuste de saldo (S8), mostrar no extrato da reserva quanto ela rendeu
  no mês e em 12 meses, em reais e em percentual sobre o saldo médio.

### Segurança e lembretes

- [ ] **F27. Bloqueio por biometria:** opção no Menu › Preferências para pedir digital ou rosto ao abrir o app
  (`expo-local-authentication`). É só a trava do aparelho na frente do app, sem conta nem senha própria. Pede build
  nativo.
- [ ] **F28. Lembrete diário de lançar:** notificação no horário escolhido ("Lançou os gastos de hoje?"), que não
  dispara se já houve lançamento no dia, e um aviso quando há notas paradas há mais de N dias. Depende das
  notificações do segundo passo da S14.
- [ ] **F29. Open Finance:** trazer os lançamentos direto do banco por um agregador (Pluggy, Belvo). As credenciais
  não podem ficar no app, então a ligação seria feita pela API própria, que entregaria o extrato para a tela de
  conferência da F2. É a maior de todas e pode ter custo: avaliar depois que a F2 estiver em uso.


