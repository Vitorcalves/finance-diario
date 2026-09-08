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

## Escrevendo um teste novo

```ts
import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
```

Para modulo puro, importe e chame. Para modulo com banco, importe tambem o
`prepararBanco` de `tests/setup/banco` e use os proprios models para semear —
assim o teste passa pelas mesmas queries que o app.
