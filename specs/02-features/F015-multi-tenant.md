# F015 — Multi-tenant (isolamento por aluno)

## Status
Implementada — 2026-07-14

## Objetivo
Escopar **todos** os dados por aluno: cada `User` ([F014](F014-autenticacao.md))
vê e manipula só os **seus** Leads, Diagnósticos, Dores e Abordagens. É a
**fundação de dados** da Fase 2 — sem isso, um aluno veria os Leads de outro.

Decisão de arquitetura em [ADR-008](../04-decisions/ADR-008-multi-tenant.md)
(row-level tenancy por `user_id`).

## Mudança no schema
Adicionar `user_id` (FK → `User`, **not null**) + índice por `user_id` em:
**Lead, Diagnóstico, Dor, Abordagem** e `UserApiKeys` ([F016](F016-configuracao-de-chaves.md)).
A [01-domain-model](../01-domain-model.md) passa a refletir `user_id` nessas
entidades (atualizar junto desta migração).

**Migração de dados da Fase 1:** os registros existentes recebem o `user_id` da
conta do operador atual (backfill), depois a coluna vira not null.

## Regra de acesso
Toda query e Server Action obtém `user_id` via `requireUser()`
([F014](F014-autenticacao.md)) e **filtra por ele** — em: coletar, diagnosticar,
priorizar, listar, abordagem, follow-up (F006), desfecho, proposta (F012),
objeções (F011), simulador (F013), dashboard (F010) e treino. Criações gravam o
`user_id` da sessão.

Padronizar num helper por tenant (ex.: `src/lib/db/scoped.ts` ou `where` sempre
derivado de `requireUser()`), pra o filtro não depender de memória caso a caso.

## Vazamento de cache
Revisar `revalidatePath`/`revalidateTag` e qualquer memoização pra **não
compartilhar** dados entre usuários (chavear cache por `user_id` quando houver).

## Critérios de aceitação
- [x] **AC1** — `Lead`, `Diagnóstico`, `Dor`, `Abordagem` e `UserApiKeys` têm
      `user_id` not null com índice; a migração faz backfill sem perder dado.
- [x] **AC2** — Coletar/diagnosticar/priorizar/abordagem criam registros com o
      `user_id` da sessão.
- [x] **AC3** — **Teste de isolamento:** logado como aluno A, nenhuma rota,
      action ou dashboard retorna dado do aluno B (nem por id direto na URL).
- [x] **AC4** — Dashboard de funil (F010) e `/treino` leem **só** os dados do
      aluno logado.
- [x] **AC5** — Deduplicação de Lead por `place_id` passa a ser **por usuário**
      (`unique(user_id, place_id)`): dois alunos podem ter o mesmo estabelecimento.
- [x] **AC6** — Acesso a um recurso de outro usuário por id (ex.: `/leads/{id}`
      de B) retorna 404/erro, não o dado.
- [x] **AC7** — Nenhuma query de domínio roda sem filtro de `user_id` (revisão +
      teste cobrindo as Server Actions existentes).

## Decisões de implementação
- Ajustar o `unique` de `Lead.place_id` para `@@unique([user_id, place_id])`
  (impacta a F001, "ignorados por já existir" passa a ser por aluno).
- Helper único de escopo por tenant consumido por todas as actions
  (`src/lib/db/scoped.ts` — `requireTenant` / `requireLeadOwned` /
  `requireAbordagemOwned`).
- Páginas de domínio com `dynamic = "force-dynamic"` + `where: { user_id }`;
  `revalidatePath` só invalida caminho — o render sempre filtra pela sessão
  (sem cache cross-tenant de payload).
- Sem lib nova (Playwright só em devDependency para e2e de isolamento).
- Suite e2e: `tests/e2e/isolamento-multi-tenant.spec.ts` com screenshot por
  cenário em `test-results/` (não versionado).

## Como testar (isolamento)
Pré-requisitos (nessa ordem):
1. `.env` com `DATABASE_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
2. Migração aplicada: `npx prisma migrate deploy`
3. Chromium do Playwright (uma vez): `npx playwright install chromium`
4. **Parar** qualquer `npm run dev` na porta 3000 — o Playwright sobe o
   servidor sozinho com `E2E_SESSION_HELPER=1` (sem isso o login e2e dá 404)

### O helper de sessão e o que o segura (F036 — 2026-08-13)

`POST /api/e2e/session` emite cookie de sessão **sem login**, pra qualquer
`userId`. Existe só pro Playwright deste teste. A única trava era a env
`E2E_SESSION_HELPER=1` — uma env vazada num ambiente hospedado virava emissor de
sessão pra qualquer conta.

Passa a exigir, **em conjunto**:

| Condição | Se falhar |
|----------|-----------|
| `E2E_SESSION_HELPER === "1"` | `404` |
| `NODE_ENV !== "production"` | `404` |
| `VERCEL_ENV` não é `production` nem `preview` | `404` |
| `E2E_SESSION_SECRET` definida ⇒ header `x-e2e-secret` igual | `401` |

`404` e não `403`: a resposta de rota inexistente não conta que o helper existe.

O segredo é **opcional** de propósito — no local, sem a env, o teste roda como
sempre; em qualquer ambiente compartilhado, defini-la fecha a porta mesmo que as
travas de ambiente falhem.

```bash
npm run test:e2e:isolamento
```
Screenshots em `test-results/isolamento/` (não versionados).

Manual rápido: duas contas (magic link Mailpit), Lead só em A → logado como B
não vê o Lead; `/leads/{id-de-A}` → 404.

## Fora do escopo (F015)
- Papéis/permissões e compartilhamento entre contas.
- Postgres RLS como camada extra → reavaliar pós-beta (ADR-008).
- Limites de uso por aluno → tratados no BYOK/lançamento ([07](../07-lancamento-para-alunos.md)).
- Campos cifrados de `UserApiKeys` → [F016](F016-configuracao-de-chaves.md)
  (aqui só a linha stub com `user_id`).
