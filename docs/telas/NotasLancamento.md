# Notas para lançar

Aba **Início** · rota `NotasLancamento` (pilha `HomeStack`) · pasta `src/views/NotasLancamento` · título "Notas para
lançar", subtítulo "Anote agora, lance quando tiver tempo"

Voltar ao [Relatório de telas](<../Relatório de telas — Finance Diário.md>) · conceitos gerais em [Base comum](README.md)

## Para que serve

Bloco de notas do que ainda falta lançar ("almoço 35 ontem no cartão"). O usuário escreve ou dita a nota na hora e
lança depois, com calma. Cada nota mostra o que o app entendeu dela (valor, parcelas, dia, conta, empresa e categoria),
e "Lançar" abre o formulário de lançamento já preenchido. Ao salvar o lançamento, a nota sai da lista.

## Navegação

- **Entrada:** atalho **Notas** da Home.
- **Saída:** voltar do header. O lançamento é feito no `NovoLancamentoForm` da Home, aberto como painel.

## Funcionalidades

### Editor

- Cartão "Nova nota" (ou "Editar nota") com um campo de várias linhas, placeholder "Ex.: almoço 35 ontem no cartão".
- **Ditado:** o botão de microfone usa o reconhecedor de fala do próprio celular, em pt-BR. Enquanto ouve, o botão
  vira "parar" e aparece "Ouvindo: <o que já entendeu>". O texto final é acrescentado ao que já estava escrito.
- Sem o módulo nativo no build, o microfone some e a tela avisa: "O ditado aparece depois de gerar o app de novo (expo
  run:android).".
- "Guardar nota" (ou "Salvar edição") grava; "Cancelar" limpa o editor. Guardar com o microfone ligado para o
  ditado antes. Avisos: "Nota guardada para lançar depois" / "Nota atualizada".

### Lista de notas (`NotaCard`)

- Da mais antiga para a mais nova, a ordem em que os gastos aconteceram.
- Cada cartão mostra o texto, o resumo do que foi reconhecido ("Entrada · R$ 35,00 · 3x · Ontem · Nubank · Bahamas ·
  Mercado") ou "Sem valor reconhecido: complete ao lançar.", a data em que foi anotada e o botão **Lançar**.
- Deslizar mostra **Editar** (o texto volta para o editor e o cartão fica marcado "Editando acima", com Lançar
  desabilitado) e **Excluir** (com "Desfazer" no aviso).
- Sem notas: "Nenhuma nota pendente", com o exemplo "uber 23,90 hoje no pix".

### Lançar

- Abre o `NovoLancamentoForm` com o rascunho interpretado da nota (tipo, descrição, valor, data, conta, parcelas,
  empresa e categoria). O usuário confere e completa.
- Ao salvar, o lançamento é gravado e a nota é apagada na mesma transação: ou as duas coisas acontecem, ou nenhuma.
  Aviso: "Lançamento registrado; a nota saiu da lista".

## O interpretador (`src/utils/interpretarNota.ts`)

Regras locais, sem rede. O que não é reconhecido fica na descrição; errar custa pouco, porque nada é gravado sem passar
pelo formulário. A ordem de leitura importa (cada trecho reconhecido é "consumido" e não serve de novo):

1. **Entrada:** "recebi", "ganhei", "entrou", "entrada (de)" viram entrada e saem do texto. "salário", "reembolso" e
   "rendimento" também indicam entrada, mas ficam na descrição.
2. **Data:** "anteontem"/"antes de ontem", "ontem", "hoje"; "05/11", "5-11", "05/11/2026", "05/11/26" (sem ano, uma
   data que ainda não chegou é do ano passado); "dia 5" (o dia 5 mais recente); "terça", "terça-feira", "sexta
   passada" (o mais recente, contando hoje).
3. **Parcelas:** "3x", "10 vezes", "parcelado em 3x" (só na saída; 2 ou mais).
4. **Valor:** "35", "35,90", "R$ 35.90", "1.234,56", "35 reais", "35 reais e 90", "conto", "pila". Com mais de um
   número, vale o que tem "R$" ou "reais"; senão, o primeiro.
5. **Conta:** pelo nome cadastrado (o nome mais longo primeiro; nomes com menos de 3 letras são ignorados). "cartão
   Nubank" tira também a palavra "cartão". Só "cartão"/"crédito" escolhe o primeiro cartão. "pix", "débito",
   "dinheiro", "espécie" e "à vista" saem do texto e ficam no caixa padrão.
6. **Empresa:** pelo nome cadastrado.
7. **Categoria:** a citada na nota (do mesmo tipo, e ela continua na descrição: "Mercado 150" é uma boa descrição) ou,
   sem ela, a usada por último na empresa reconhecida.
8. **Descrição:** o que sobrou, sem pontuação solta e sem conectores ("de", "no", "pra", "paguei", "gastei"...) nas
   pontas ou logo antes de um trecho reconhecido. Primeira letra maiúscula. Sem sobra, usa o nome da empresa.

Exemplo: "almoço 35 ontem no cartão" → saída, descrição "Almoço", R$ 35,00, data de ontem, primeiro cartão.

O catálogo usado vem do `useCatalogoLancamento` da Home (contas caixa e cartão ativas, empresas, categorias e a última
categoria de cada empresa). Os rascunhos são recalculados (`useMemo`) quando as notas ou o catálogo mudam.

## O ditado (`useDitado`)

- Carrega `expo-speech-recognition` sob demanda (`require` dentro de `try`): num build anterior à biblioteca o módulo
  nativo não existe, e um `import` direto derrubaria o app inteiro. Sem ele, `disponivel = false`.
- `iniciar`: confere se há serviço de reconhecimento, pede a permissão do microfone e começa com `lang: 'pt-BR'`,
  resultados parciais, sem modo contínuo e 1 alternativa.
- Ouvintes: `start`, `end`, `result` (parcial vai para `parcial`; o final chama `onTexto`) e `error`. Sair da tela no
  meio da fala aborta o reconhecimento, para o microfone não ficar ligado.
- Mensagens de erro (`mensagemErroFala`):

| Código                     | Mensagem                                                            |
|----------------------------|---------------------------------------------------------------------|
| `aborted`                  | (nenhuma)                                                           |
| `not-allowed`              | "Permita o uso do microfone para ditar a nota."                     |
| `no-speech`, `speech-timeout` | "Não ouvi nada. Toque no microfone e fale de novo."              |
| `network`                  | "O reconhecimento de voz deste celular precisa de internet."        |
| `language-not-supported`   | "O reconhecimento de voz do celular não tem o português instalado." |
| `service-not-allowed`      | "O celular não tem um serviço de reconhecimento de voz ativo."      |
| `busy`                     | "O reconhecimento de voz está ocupado. Tente de novo."              |
| outros                     | "Não foi possível ouvir. Tente de novo."                            |

## Arquivos

| Arquivo                     | Papel                                                                 |
|-----------------------------|-----------------------------------------------------------------------|
| `index.tsx`                 | Editor, lista, interpretação das notas e o formulário de lançamento   |
| `useNotasLancamento.ts`     | Carga, salvar, excluir com desfazer e lançar (com o catálogo)         |
| `useDitado.ts`              | Reconhecimento de fala do celular                                     |
| `components/NotaCard.tsx`   | Cartão da nota com o resumo do que foi entendido                      |

```
NotasLancamentoView
├── ScreenHeader (voltar)
├── KeyboardAvoidingScreen → ScrollView
│   ├── editor: TextInput multilinha + microfone + Cancelar/Guardar
│   └── LoadingState | EmptyState | NotaCard* (SwipeableRow)
└── NovoLancamentoForm (rascunho da nota)
```

## Lógica (`useNotasLancamento`)

- Ao ganhar foco: `listNotasLancamento()` e `getLocalPadrao()`, e recarrega o catálogo de lançamento.
- `salvar(texto, id?)`: `updateNotaLancamento` (troca o texto e o `updated_at`; a data de criação e a posição não
  mudam) ou `insertNotaLancamento`. As duas normalizam o texto: juntam espaços e quebras de linha e recusam nota
  vazia.
- `excluir(nota)`: `deleteNotaLancamento` e aviso "Nota excluída" com "Desfazer" (`restaurarNotaLancamento` regrava com
  o mesmo id e datas).
- `lancar(nota, lancamento)`: `emTransacao` com `registrarLancamento(lancamento, localPadrao)` e
  `deleteNotaLancamento(nota.id)`.

## Models e tabelas

| Função                                                         | Módulo                 | Tabelas              |
|----------------------------------------------------------------|------------------------|----------------------|
| `listNotasLancamento`, `insertNotaLancamento`, `updateNotaLancamento`, `deleteNotaLancamento`, `restaurarNotaLancamento`, `normalizarTextoNota` | `notasLancamento.ts` | `notas_lancamento` (migration 017) |
| `registrarLancamento`                                          | `lancamentos.ts`       | ver [Home](Home.md)  |
| `getLocalPadrao`                                               | `settingsModel.ts`     | `settings`           |
| catálogo (`useCatalogoLancamento`)                             | vários                 | cadastros            |

A tabela `notas_lancamento` (id, texto, created_at, updated_at) não tem ligação com outras tabelas e entra no backup em
JSON. `contarNotasLancamento` existe no model, mas nenhuma tela usa (pendência em Tarefas).

## Validações e mensagens

| Situação                    | Mensagem                                           |
|-----------------------------|----------------------------------------------------|
| Nota vazia                  | "Escreva ou dite a nota antes de salvar." (aviso)  |
| Falha ao salvar             | "Não foi possível salvar a nota."                  |
| Falha ao excluir            | "Não foi possível excluir a nota."                 |
| Falhas do ditado            | Ver a tabela de `mensagemErroFala`                 |

## Testes

- `src/models/notasLancamento.test.ts`: normalização, ordem, edição e desfazer.
- `src/utils/interpretarNota.test.ts`: valor, datas, parcelas, entrada, conta, empresa, categoria e descrição.

## Observações

- O ditado precisa de um build nativo novo (`expo run:android`) com `expo-speech-recognition`.
- A ideia original era usar IA para transformar a nota; foi trocada pelo interpretador local (ver
  [Tarefas](<../Tarefas — Finance Diário.md>), item 3).
