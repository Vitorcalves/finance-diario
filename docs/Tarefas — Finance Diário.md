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
  - [x] **Extra, backup manual:** botão "Criar backup no app" em Integração › Exportar, que grava uma cópia na hora (no
    mesmo rodízio das 5).
- [ ] **3. Bloco de notas de lançamentos:** um bloco de notas para anotar rápido, por texto ou voz, o que ainda falta
  lançar ("almoço 35 ontem no cartão") e lançar depois, quando tiver tempo. Na hora de lançar, a IA pode transformar a
  nota num `RascunhoLancamento`, que o `NovoLancamentoForm` já sabe abrir (a Lista de compras usa isso).
- [ ] **4. Tags para eventos:** marcar lançamentos com tags como "Viagem julho" ou "Reforma". As tabelas `tags` e
  `transacoes_tags` existem desde a migration 001, mas nenhuma tela usa. Elas respondem "quanto custou a viagem?", coisa
  que a categoria não responde.
- [ ] **5. Inflação pessoal:** mostrar quanto a sua cesta de compras de verdade subiu mês a mês, calculado a partir do
  histórico de preços.
- [ ] **6. Limite mensal por categoria:** definir um limite por categoria de lançamento e, usando a projeção que a tela
  Mês já calcula, avisar algo como "no ritmo atual, Mercado estoura dia 22".

## Ajustes menores

Vindos do [Relatório de telas](<Relatório de telas — Finance Diário.md>), sem ordem definida.

- [ ] **Tela órfã:** `src/views/More` não está em nenhuma rota. Remover ou ligar a uma rota.
- [ ] **Erro de digitação:** o estado vazio de Faturas diz "lançe uma compra"; o correto é "lance".
- [ ] **Títulos repetidos:** Categorias de lançamento e Categorias de produto exibem o mesmo título "Categorias"; só o
  subtítulo diferencia.
