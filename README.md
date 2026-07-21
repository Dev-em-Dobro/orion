# Orion Lead Hunter

> Repositório: `prospect-engine`

Motor de prospecção para alunos (Dev em Dobro). Coleta estabelecimentos via
Google Places, identifica quem tem presença digital fraca (sem site, site
lento, sem HTTPS), prioriza cada um por um score e usa a Claude API pra
escrever o texto que inicia a conversa com cada Lead.

Multi-tenant (Fase 2): cada aluno faz login e cola as próprias chaves de API
em `/configuracao` (BYOK). Personalize a oferta em `src/lib/brand.ts`.

Esse texto gerado — pronto pra você enviar por WhatsApp ou e-mail — é o
que o projeto chama de **Outreach**. É o termo oficial, definido no
[domain model](./specs/01-domain-model.md), e aparece com esse mesmo
sentido em todo o código e na interface.

Row-level multi-tenant por `user_id` (F015). Chaves BYOK cifradas (F016 / ADR-009).

## Stack
- Next.js 15 (App Router) + TypeScript estrito
- PostgreSQL via Neon + Prisma ORM
- Tailwind + shadcn/ui
- Claude API, Google Places API, PageSpeed Insights API

## Como rodar localmente

Pré-requisitos: Node 20+, conta no Neon, `BYOK_MASTER_KEY` (e depois as
chaves do aluno em `/configuracao`).

```bash
# instalar dependências (depois que o Next estiver inicializado)
npm install

# configurar as variáveis de ambiente (copie .env.example → .env e preencha)
# DATABASE_URL, BYOK_MASTER_KEY (openssl rand -base64 32)
# F014 auth: BETTER_AUTH_SECRET, BETTER_AUTH_URL, EMAIL_* / RESEND_SMTP_*
# (magic link local: npm run mailpit + EMAIL_PROVIDER=mailpit — ver F014)
# Chaves Google/Anthropic/ScreenshotOne: UI /configuracao (F016), não .env
# Isolamento multi-tenant (F015): npm run test:e2e:isolamento
# → screenshots em test-results/isolamento/ (gitignored)
# Unitários (ADR-012): npm test
# Coverage das libs: npm run test:coverage

# (opcional) personalizar a sua empresa/oferta nas mensagens: src/lib/brand.ts

# criar as tabelas no banco (migrations)
npx prisma migrate dev

# magic link local (Mailpit) — UI em http://127.0.0.1:8025
npm run mailpit

# subir o servidor de desenvolvimento
npm run dev
```

Abra http://localhost:3000. Sem sessão, o app redireciona para `/login`.
Magic links locais aparecem em http://127.0.0.1:8025.

## Obter a chave da Google Places API

> 📘 **Alunos:** há um passo a passo completo — criar a chave, como funcionam
> os créditos/cobrança e como configurar sem vazar a chave — em
> [`docs/tutorial-google-places.md`](./docs/tutorial-google-places.md).

A chave do Google Places (e da PageSpeed Insights) é criada dentro de um
projeto no [Google Cloud Console](https://console.cloud.google.com).

> **Atenção:** o Google só permite **criar um projeto** se a conta tiver
> **autenticação de dois fatores (2FA) habilitada**. Sem 2FA o console
> bloqueia a criação do projeto. Antes de abrir o `console.cloud.google.com`,
> ative a verificação em duas etapas em
> [myaccount.google.com/security](https://myaccount.google.com/security).

Com o 2FA ativo:

1. Acesse o [Google Cloud Console](https://console.cloud.google.com) e
   crie um novo projeto.
2. Em **APIs e serviços → Biblioteca**, habilite a **Places API** e a
   **PageSpeed Insights API**.
3. Em **APIs e serviços → Credenciais**, crie uma **chave de API**.
4. Cole a chave em **Configuração** (`/configuracao`) no slot Google
   (Places + PageSpeed usam a mesma chave).

## Deploy (Vercel + Neon) — beta

Checklist mínimo para colocar o app no ar para alunos:

1. **Neon de produção** — projeto/branch de prod; `DATABASE_URL` na Vercel.
   Migrations do banco principal já aplicadas (`prisma migrate deploy`).
   Backups: painel Neon.
2. **Secrets do servidor** (Vercel → Environment Variables) — **sem default**;
   ausência falha no boot e em `/api/health` (503):
   - `BYOK_MASTER_KEY` — `openssl rand -base64 32` (ADR-009 / F016)
   - `BETTER_AUTH_SECRET` — `openssl rand -base64 32` (F014)
   - `BETTER_AUTH_URL` — `https://orion-lead-hunter.devemdobro.com`
   - `DATABASE_URL`
   - E-mail do magic link (`EMAIL_PROVIDER=resend` + vars Resend)
   - Google OAuth (opcional): `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET`
3. **Health** — `GET /api/health` deve retornar `{"ok":true}` (secrets + `SELECT 1`).
4. **Sentry (ADR-013)** — `SENTRY_DSN` + `NEXT_PUBLIC_SENTRY_DSN` (mesmo valor).
   Sem DSN o app sobe normalmente (no-op). Opcional: `SENTRY_AUTH_TOKEN` /
   `SENTRY_ORG` / `SENTRY_PROJECT` pra source maps no build.
5. **F008 em serverless** — Playwright não roda na Vercel; o aluno precisa da
   chave **ScreenshotOne** em `/configuracao` (BYOK). Já implementado em
   `src/lib/diagnostico-ux/screenshot.ts` (ADR-006).
6. **Páginas legais** — `/termos` e `/privacidade` (LGPD); e-mail em
   `src/lib/legal.ts`.
7. **Domínio** — `https://orion-lead-hunter.devemdobro.com` (Cloudflare DNS +
   Vercel). Conferir `BETTER_AUTH_URL` e redirect OAuth/magic link nessa URL.

Variáveis de referência: [`.env.example`](./.env.example).

## Testes

```bash
# Libs puras (Vitest) — score, proposta, cifra, secrets…
npm test

# Coverage em src/lib (~83% stmts)
npm run test:coverage

# Watch
npm run test:watch

# E2E isolamento multi-tenant (F015) — precisa app + Neon + Chromium
npm run test:e2e:isolamento
```

## Documentação

Toda a definição do produto vive em [`/specs`](./specs):

- [`00-product-vision.md`](./specs/00-product-vision.md) — visão e escopo
- [`01-domain-model.md`](./specs/01-domain-model.md) — as entidades e a
  linguagem ubíqua (o vocabulário oficial: os nomes obrigatórios em todo
  o projeto)
- [`02-features/`](./specs/02-features) — specs de cada feature (`F001`, `F002`, ...)
- [`03-contracts/`](./specs/03-contracts) — contratos das APIs externas
- [`04-decisions/`](./specs/04-decisions) — ADRs: o registro de cada
  decisão técnica e o motivo dela

Regras pro agente de IA: [`CLAUDE.md`](./CLAUDE.md).
