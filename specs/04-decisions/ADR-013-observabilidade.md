# ADR-013 — Observabilidade (erros em produção)

## Status
Aceito — 2026-07-15 (**opção A** — Sentry no MVP; PostHog fora desta fase).

## Contexto
Após o beta, precisamos **ver erros** no app hospedado
([07-lancamento](../07-lancamento-para-alunos.md) §9). Já existe:

- `GET /api/health` — liveness de secrets + Postgres
- Logs da Vercel (stdout/stderr) — sem agrupamento, alerta nem contexto

O lançamento cita **PostHog** para quotas/uso — isso é produto/analytics e
fica **fora** do MVP de erros. Lib nova ⇒ ADR antes do código.

### Escopo MVP
Captura de erros **client + server** (+ health). Sem product analytics.

### Constraints
- Nunca enviar plaintext de chave BYOK, magic links ou secrets.
- Next 15 App Router; sample de performance **0** no beta (só erros).
- Sem DSN ⇒ no-op (dev local não obriga conta Sentry).

## Decisão
**Sentry (`@sentry/nextjs`)**.

- Vars: `SENTRY_DSN` (obrigatória só em prod se quiser eventos); opcional
  `SENTRY_AUTH_TOKEN` / org / project só pra upload de source maps no CI.
- Context mínimo: `user.id` quando autenticado.
- `/api/health` permanece independente.
- PostHog = evolução futura (reabrir ADR ou adendo).

## Alternativas consideradas

| Opção | Fit erros MVP | Nota |
|-------|---------------|------|
| **A Sentry** | Alto | Escolhida |
| B PostHog only | Médio | Melhor pra uso/quotas |
| C Só Vercel | Baixo | Complementar |
| D Sentry + PostHog | Alto (faseado) | Futuro natural |
| E OTel + Axiom/Grafana | Baixo p/ beta | Overkill |

## Consequências
### Positivas
- Stack traces e agrupamento; alertas no Sentry.
### Negativas / a aceitar
- Conta Sentry + DSN na Vercel; dep `@sentry/nextjs`.
