# Integração

Aba **Menu** · rota `Integracao` (pilha `MenuStack`) · pasta `src/views/Integracao` · título "Integração",
subtítulo "Backup, API e perguntas sobre seus dados"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Tira e põe os dados do app. Quatro modos num seletor:

- **Exportar:** monta um JSON com todas as tabelas, para salvar como arquivo, compartilhar como texto ou copiar; ou
  grava um backup na pasta do próprio app.
- **Importar:** restaura um backup salvo no app, ou valida um JSON colado/escolhido e sobrescreve o banco inteiro.
- **API:** envia uma cópia do banco para a API de persistência (`POST /sync`).
- **IA:** pergunta, em linguagem natural, sobre os dados já enviados à API (`POST /ia/consultar`).

## Navegação

- **Entrada:** Menu › Sistema › Integração. O aviso do "Recriar banco" (Menu) aponta para Integração › Importar.
- **Saída:** voltar do header. O modo começa sempre em Exportar.

## Funcionalidades

### Exportar (`ExportarPainel`)

- **Gerar JSON do banco:** lê todas as tabelas e mostra "Registros exportados" (contagem por tabela e total), a data
  de geração e o tamanho em caracteres.
- **Salvar arquivo .json:** grava `integracao-AAAA-MM-DD.json` no cache e abre a folha de compartilhamento do sistema
  ("Salvar em Arquivos", Drive...).
- **Compartilhar como texto:** manda o JSON como mensagem. Acima de 60 mil caracteres avisa que vários apps de mensagem
  cortam o texto e oferece salvar como arquivo.
- O JSON aparece numa caixa de texto selecionável (`CaixaJson`). Acima de 150 mil caracteres a caixa começa fechada
  ("Mostrar JSON na tela"), porque montar um texto enorme trava a tela.
- **Criar backup no app:** grava uma cópia na pasta de backups do app (no rodízio das 5 últimas). Aviso: "Backup
  salvo no app. Para restaurar, use o modo Importar."

### Importar (`ImportarPainel` + `BackupsAutomaticos`)

- Aviso "Substitui todo o banco": os dados atuais são apagados e trocados pelos do JSON; se algo falhar na carga, nada
  é gravado.
- **Backups salvos no app:** as cópias da pasta de backups, da mais nova para a mais antiga, com a data e o motivo
  ("Antes de atualizar o banco (versão 17 → 18)", "Antes de recriar o banco", "Backup manual"). "Restaurar" lê a cópia,
  confirma ("Todos os dados atuais serão apagados e substituídos pelos N registro(s) do backup de DD/MM/AAAA HH:mm.
  Esta ação não pode ser desfeita.") e sobrescreve o banco. Sem cópias: "Nenhum backup salvo no app ainda.".
- **Escolher arquivo .json:** abre o seletor do sistema e põe o conteúdo na caixa.
- **Caixa de texto** para colar o JSON; **Validar JSON** e **Limpar**.
- Validado, aparece "Registros que serão gravados", a data de origem e o "Schema N", e o botão **Sobrescrever banco**,
  que confirma de novo antes de gravar. Qualquer edição no texto invalida a prévia.
- Sucesso: "Banco restaurado com N registros".

### API (`ApiPainel`)

- **Endereço da API** (ex.: `http://192.168.0.10:8010`) e **Chave (X-API-Key)**, opcional e oculta. Os dois são
  gravados em `settings` a cada alteração.
- **Enviar banco para a API:** exporta o banco e faz `POST {url}/sync`. Mostra "Registros recebidos pela API", "Envio
  #N recebido em ..." e quantos registros; se a API ainda não espelha alguma tabela/coluna, lista as ignoradas. "O app
  só manda dados; nada é alterado aqui."

### IA (`IaPainel`)

- Precisa do endereço configurado na aba API ("Informe o endereço da API na aba API antes de perguntar.").
- **Pergunta** (ex.: "Quanto ainda falta pagar do tênis de corrida?") e a chave **Raciocinar antes de responder**
  ("Mais lento, porém mais preciso"; começa ligada).
- **Perguntar** faz `POST {url}/ia/consultar` com `{ pergunta, pensar, max_passos: 6 }`.
- Resposta: a pergunta, o texto (com `**negrito**`), o aviso de resposta cortada, o modelo, o tempo, os passos, as
  consultas, os tokens de entrada e saída e a hora. Seções recolhíveis: **Consultas executadas** (o SQL de cada uma,
  com linhas e tempo, ou o erro) e **Raciocínio do modelo**.
- **Limpar** apaga a pergunta e a resposta. Nada vai para o banco local.

## Arquivos

| Arquivo                              | Papel                                                        |
|--------------------------------------|--------------------------------------------------------------|
| `index.tsx`                          | Header, seletor dos 4 modos e o painel de cada um            |
| `useIntegracao.ts`                   | Estado e ações de exportar, importar, backups, API e IA      |
| `types.ts`                           | `ModoIntegracao`, `ResultadoExportacao`, `PreviaImportacao`, `ResultadoEnvioApi`, `ResultadoConsultaIa` |
| `components/ExportarPainel.tsx`      | Gerar, salvar, compartilhar, mostrar e criar backup          |
| `components/ImportarPainel.tsx`      | Backups do app, arquivo, caixa, validar e sobrescrever       |
| `components/BackupsAutomaticos.tsx`  | Lista das cópias com "Restaurar"                             |
| `components/ApiPainel.tsx`           | Endereço, chave e envio                                      |
| `components/IaPainel.tsx`            | Pergunta, raciocínio, resposta e consultas                   |
| `components/CaixaJson.tsx`           | Área de texto monoespaçada (só leitura sem `onChangeText`)   |
| `components/ResumoTabelas.tsx`       | Contagem de registros por tabela                             |
| `components/arquivoJson.ts`          | Escolher arquivo (`expo-document-picker`) e salvar/compartilhar (`expo-sharing`) |

```
IntegracaoView
├── ScreenHeader (voltar)
└── KeyboardAvoidingScreen → ScrollComTeclado
    ├── SegmentedControl (Exportar | Importar | API | IA)
    └── ExportarPainel | ImportarPainel (BackupsAutomaticos, CaixaJson, ResumoTabelas) | ApiPainel | IaPainel
```

## Lógica (`useIntegracao`)

- Na montagem: `getApiConfig()` e `listarBackupsAutomaticos()` (a lista é relida depois de criar um backup).
- `gerarExportacao` → `exportarBanco()` + `resumirBackup()`; o JSON é formatado com 2 espaços.
- `criarBackup` → `criarBackupManual()`.
- `validarImportacao` → `analisarBackup(texto)` (só valida a forma, sem tocar no banco).
- `confirmarImportacao` → confirmação → `importarBanco(analisarBackup(texto))`.
- `restaurarBackupAutomatico` → `lerBackupAutomatico(copia)` → confirmação → `importarBanco(backup)`.
- `setApiConfig` → `saveApiConfig` (sem espaços nas pontas).
- `enviarParaApi` → `enviarParaApi(config)` de `sincronizacaoApi.ts`.
- `consultarIa` → `consultarIa(config, { pergunta, pensar, max_passos: MAX_PASSOS_PADRAO })`.

### Formato do backup (`src/models/backup.ts`)

- `{ formato: "finance-diario-backup", versao: 1, schema_version, exportado_em, tabelas: { nome: [linhas] } }`.
- As tabelas são lidas de `sqlite_master` (toda migration nova entra sozinha no backup); `migrations`,
  `sqlite_sequence` e `android_metadata` ficam de fora. A versão do schema é o id da última migration aplicada.
- **Validação da forma** (`analisarBackup`): texto vazio, JSON inválido, `formato` ou `versao` diferentes,
  `schema_version` ausente, `tabelas` ausente, tabela que não é lista, registro que não é objeto.
- **Validação contra o schema** (`importarBanco`, antes de escrever): recusa backup de versão mais nova do app, tabela
  ou coluna que não existe no banco e valor de tipo não suportado.
- **Carga:** desliga as chaves estrangeiras, apaga todas as tabelas, zera os contadores de `AUTOINCREMENT` e insere
  tudo numa transação, com `contas` e `faturas` antes das demais. Falha no meio desfaz tudo. O schema não muda.
- **Reparos de backup antigo:** sem `categorias_lancamento`, semeia as categorias padrão; antes da migration 015,
  recria o caixa padrão e deduz a natureza das transações; antes da 016, a cotação sem marca herda a variante do item.

### Backups automáticos (`src/models/backupAutomatico.ts`)

- Pasta `backups/` dentro da pasta de documentos do app (o sistema não a limpa, como faz com o cache).
- Nome do arquivo: `2026-11-06T18-52-36-184Z_<motivo>.json` (data e hora UTC + motivo), então a ordem alfabética é a
  cronológica. Motivos: `migration-15-para-16`, `recriar-banco`, `manual`.
- Ficam as 5 últimas (`MAX_BACKUPS_AUTOMATICOS`): a cada cópia nova, as mais antigas saem. Erro ao gravar sobe e
  nenhuma antiga é apagada; erro ao apagar as antigas só gera um aviso no log.
- Quem grava: `backupAntesDasMigrations` (na abertura do app, quando há migration pendente; sem a cópia, nenhuma
  migration roda), `recriarBancoComBackup` (Menu) e `criarBackupManual` (esta tela).

### API (`src/models/sincronizacaoApi.ts`)

- `POST /sync` com o mesmo JSON do Exportar; a API guarda a cópia e espelha as tabelas no Postgres. Nada volta para o
  banco do app por aqui: para trazer dados de volta, só o Importar (com o JSON de `GET /backup` da API).
- `POST /ia/consultar`: a API responde consultando o espelho com um modelo de linguagem.
- Header `X-API-Key` só quando há chave; a URL perde as barras finais.
- Erros traduzidos: sem endereço ("Informe o endereco da API antes de enviar."), pergunta vazia, falha de conexão
  ("Nao foi possivel conectar em ... Confira o endereco e se a API esta no ar."), 401 ("A API recusou a chave
  (X-API-Key). Confira o campo Chave.") e outros HTTP (o `detail` da API ou "HTTP 500").

## Models e tabelas

| Função                                                         | Módulo                  | O que toca                          |
|----------------------------------------------------------------|-------------------------|-------------------------------------|
| `exportarBanco`, `resumirBackup`, `analisarBackup`, `importarBanco` | `backup.ts`        | todas as tabelas de dados           |
| `listarBackupsAutomaticos`, `lerBackupAutomatico`, `criarBackupManual` | `backupAutomatico.ts` | arquivos em `backups/`        |
| `enviarParaApi`, `consultarIa`                                 | `sincronizacaoApi.ts`   | rede (só lê o banco)                |
| `getApiConfig`, `saveApiConfig`                                | `settingsModel.ts`      | `settings` (`api_url`, `api_token`) |

## Testes

- `src/models/backup.test.ts`: export (schema, tabelas internas, descoberta pelo schema, resumo), round-trip (REAL,
  NULL, acentos, AUTOINCREMENT, FKs), sobrescrita, recusas antes de escrever, falha no meio e os reparos de backup
  antigo.
- `src/models/backupAutomatico.test.ts`: gravação e rodízio, falhas, cópia antes das migrations, lista, leitura,
  recriar com backup e backup manual.
- `src/models/sincronizacaoApi.test.ts`: URL, requisições, erros, envio sem escrever no banco e a configuração em
  `settings`.

## Observações

- A chave da API fica gravada em texto puro na tabela `settings` (e entra no backup em JSON).
- Restaurar ou importar não grava uma cópia do banco atual antes: o aviso pede para exportar um backup antes.
- `index.tsx` ainda tem comentários "← novo" nos campos de salvar/escolher arquivo, sobra de uma edição.
