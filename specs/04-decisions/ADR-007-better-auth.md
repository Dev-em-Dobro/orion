# ADR-007 — Better Auth para autenticação (login)

## Status
Aceito — 2026-07-13 (decisão registrada em
[07 · Decisões tomadas](../07-lancamento-para-alunos.md))

## Contexto
A Fase 2 ([07](../07-lancamento-para-alunos.md)) transforma a ferramenta interna
num app hospedado **para alunos**: cada aluno faz **login** e o sistema é
**multi-tenant** ([ADR-008](ADR-008-multi-tenant.md)). Isso introduz uma **lib
nova** de autenticação — o que, pela regra do `CLAUDE.md` ("Sem nova lib sem
ADR"), exige esta decisão.

Requisitos: sessão de servidor, integração limpa com **Prisma/Neon** (a stack
fixa), proteção das rotas do app e um helper de sessão pras Server Actions
(`requireUser()`), que a F015 usa pra escopar toda query por `user_id`.

## Decisão
Adotar o **Better Auth** como camada de autenticação, com **adapter Prisma**
sobre o Neon.

- **Métodos:** **Google OAuth** (principal) + **magic link** — **sem senha**
  (nada de armazenar/resetar senha; menos superfície de ataque). O magic link
  depende de e-mail transacional ([ADR-010](ADR-010-email-transacional.md)).
- **Modelos no schema:** `User`, `Session`, `Account`, `Verification` (gerados
  pelo Better Auth). São entidades de **infra de auth**, distintas das entidades
  de domínio ([01](../01-domain-model.md)).
- **Proteção de rotas:** middleware exige sessão em `/`, `/leads`,
  `/treino`, `/configuracao`. Rotas públicas: login e as de callback.
- **Sessão nas Server Actions:** helper `requireUser()` em `src/lib/auth/` que
  devolve o usuário da sessão ou lança — base do escopo multi-tenant (F015).
- **Segredo de sessão** via env do servidor (não commitado; ver deploy em 07).

## Alternativas consideradas
- **Auth.js / NextAuth**: maduro, mas a DX de sessão + adapter em App Router é
  mais atritada e a modelagem de conta é menos flexível que a do Better Auth
  pro nosso caso (magic link + OAuth sem senha).
- **Clerk / Auth0** (auth como serviço): rápido, mas é dependência SaaS paga com
  dado de login **fora** da nossa base — conflita com custo baixo e com manter o
  controle dos dados do aluno (LGPD).
- **Rolar autenticação própria**: rejeitado — segurança de sessão/OAuth é
  exatamente o que não se reinventa.

## Consequências
### Positivas
- Login pronto (OAuth + magic link), sessão e CSRF tratados pela lib.
- Adapter Prisma mantém os dados de auth no mesmo Neon (um banco só).
- `requireUser()` vira o ponto único de checagem de sessão pro multi-tenant.

### Negativas / a aceitar
- Dependência nova + tabelas de auth no schema.
- Magic link **hard-depende** de deliverability de e-mail (ADR-010).
- Plano B, se o e-mail atrapalhar o lançamento: habilitar e-mail+senha
  temporariamente (exigiria fluxo de reset — evitado por ora).
