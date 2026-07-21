# ADR-012 — Runner de testes unitários (Vitest)

## Status
Aceito — 2026-07-15

## Contexto
A suíte E2E Playwright cobre só o isolamento multi-tenant (F015). O item de
dívida em [07-lancamento](../07-lancamento-para-alunos.md) §9 pede testes das
**libs puras** (`score`, `precos`, `servicos`, cifra BYOK, helpers de escopo).
Não havia runner. Introduzir ferramenta de teste = **lib nova** → ADR.

Escopo desta decisão: **unitários** em Node, sem browser e sem Next. E2E
permanece Playwright (`@playwright/test`, já ADR-implícito via F015/F008).

## Decisão
**Vitest** como runner de unitários.

- Arquivos em `tests/unit/**/*.test.ts`
- Alias `@/` alinhado ao `tsconfig` (`vite-tsconfig-paths` ou `resolve.alias`)
- Script: `npm test` (= `vitest run`) e `npm run test:watch`
- Sem jsdom por padrão — libs são Node/puro
- CI futuro: `npm test` antes/além do E2E de isolamento

## Alternativas consideradas
- **node:test**: zero dep, mas assert/snapshot/watch e DX piores; alias `@/`
  exigiria scaffolding próprio.
- **Jest**: ecossistema maduro, porém mais pesado e overlap com Vitest no
  ecossistema Vite/Next atual.
- **Só Playwright**: inadequado para funções puras (lento, flaky, caro).

## Consequências
### Positivas
- Feedback rápido nas fórmulas (F003/F012) e na cifra (ADR-009).
- Regressão do arredondamento float de `precos` coberta por teste.

### Negativas / a aceitar
- DevDependency a mais; manter versão alinhada ao Node 20+.
- Server Actions e fluxos UI **não** entram neste ADR — ficam E2E/fast-follow.
