# Testes

```bash
npm test              # roda a suite inteira
npm run test:watch    # re-roda ao salvar
npm run typecheck     # tipos do app
npm run typecheck:tests  # tipos dos testes
```

Sem dependencia nova: `node --test` (nativo do Node) rodando TypeScript pelo
`tsx`, que ja era devDependency.

## Onde ficam

Cada teste mora ao lado do que testa, como `<modulo>.test.ts`. Esta pasta tem
so a infraestrutura.

## Como os testes de banco funcionam

`tsconfig.test.json` aponta o modulo `expo-sqlite` para `setup/expo-sqlite.ts`,
um adapter sobre o `node:sqlite`. `src/models/database.ts` roda sem alteracao
nenhuma e os testes exercitam o SQL de verdade — schema real, migrations reais,
constraints reais — em um banco em memoria.

Todo teste que toca o banco comeca com:

```ts
beforeEach(async () => {
  await prepararBanco(); // banco vazio, migrations aplicadas
});
```

O `node --test` roda cada arquivo em um processo separado, entao a conexao em
cache de um arquivo nunca vaza para outro.

Para testar uma migration pendente (o caso de quem atualiza o app), o
`desfazerUltimaMigration()` de `setup/banco.ts` volta o banco para a versao
anterior; a proxima `initializeDatabase()` aplica a ultima migration de novo.

## Arquivos

Do mesmo jeito, `expo-file-system/legacy` aponta para `setup/expo-file-system.ts`,
um sistema de arquivos em memoria (usado pelos backups automaticos). Chame
`__novoSistemaDeArquivos()` no `beforeEach`; `__falharEm('writeAsStringAsync', erro)`
simula disco cheio e outras falhas.

## Escrevendo um teste novo

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
```

Para modulo puro, importe e chame. Para modulo com banco, importe tambem o
`prepararBanco` de `tests/setup/banco` e use os proprios models para semear —
assim o teste passa pelas mesmas queries que o app.
