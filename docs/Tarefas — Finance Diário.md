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


