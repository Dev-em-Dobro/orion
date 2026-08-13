# F014 — Autenticação (login)

## Status
Implementada — 2026-07-13

## Objetivo
Dar a cada **aluno** uma conta própria: **login**, **sessão** e **proteção das
rotas** do app. É o pré-requisito do multi-tenant ([F015](F015-multi-tenant.md)) —
sem sessão não há `user_id` pra escopar os dados — e da configuração de chaves
([F016](F016-configuracao-de-chaves.md)).

Decisão de stack em [ADR-007](../04-decisions/ADR-007-better-auth.md) (Better
Auth) e [ADR-010](../04-decisions/ADR-010-email-transacional.md) (e-mail do
magic link).

## Linguagem
- **Usuário (aluno)** — dono de uma conta; entidade de **infra de auth**, distinta
  das entidades de domínio ([01](../01-domain-model.md)).
- **Sessão** — vínculo autenticado do aluno com o app.

## Métodos de login
**Google OAuth** (principal) + **magic link** — **sem senha**. Sem cadastro com
senha, sem "recuperar senha".

## Modelos (schema)
Gerados pelo Better Auth com adapter Prisma: `User`, `Session`, `Account`,
`Verification`. Migração dedicada.

## Telas
- `/login` — botão "Entrar com Google" + campo de e-mail para magic link.
- Estado "enviamos um link para seu e-mail" (aguardando verificação).
- Logout (na navbar).

## Fluxo
1. Aluno acessa rota protegida sem sessão → redirect pra `/login`.
2. Escolhe **Google** (OAuth) ou informa e-mail → recebe **magic link** (e-mail
   via [ADR-010](../04-decisions/ADR-010-email-transacional.md)).
3. Callback cria/recupera `User` + abre `Session`; redirect pro destino original
   (ou `/`).
4. Server Actions chamam `requireUser()` (`src/lib/auth/`) → devolve o usuário da
   sessão ou lança. É o ponto único de checagem, consumido pela F015.

## Critérios de aceitação
- [x] **AC1** — Sem sessão, acessar `/`, `/leads`, `/treino` ou
      `/configuracao` redireciona pra `/login`. Rotas de login/callback são públicas.
- [x] **AC2** — Login com Google cria `User`+`Session` na 1ª vez e reusa nas
      seguintes (mesmo `User` pelo e-mail/Account).
- [x] **AC3** — Magic link: informar e-mail dispara um e-mail com link válido;
      clicar autentica. `errorCallbackURL` **não** aninha o `callbackUrl`
      (Better Auth faz `decodeURIComponent` de novo no verify → dois `?` →
      `INVALID_CALLBACK_URL`). Erros usam `/login?error=…` simples.
      `callbackURL` pós-sucesso pode manter path+query (`/leads?site=…`).
      abrir o link autentica e abre sessão. Link expirado/reusado → erro claro.
- [x] **AC4** — `requireUser()` devolve o usuário logado nas Server Actions e
      lança (tratado como erro amigável) quando não há sessão.
- [x] **AC10** — **Cookie inválido não vira tela de erro.** Cookie presente mas
      sem sessão válida no banco redireciona pro login com o cookie limpo,
      igual a não ter cookie nenhum. Ver "Cookie velho" abaixo.
- [x] **AC5** — Logout encerra a sessão e volta a barrar as rotas protegidas.
- [x] **AC6** — Segredo de sessão (`BETTER_AUTH_SECRET`) e `BETTER_AUTH_URL`
      lidos de env do servidor; ausência → erro descritivo no boot, nunca
      valores default. Credenciais Google (`GOOGLE_CLIENT_*`) são **opcionais**
      no boot: se ausentes, OAuth Google fica desabilitado (magic link segue);
      se presentes, o provider é habilitado sem defaults inventados.
- [x] **AC11** ([F036](F036-endurecimento-de-seguranca.md)) — Mais de 20
      requisições em 60s do mesmo IP a `/api/auth/*` são recusadas pelo Better
      Auth. Chamadas server-side a `auth.api.*` seguem sem limite.

## Cookie velho (AC10 — corrigido em 2026-08-11)

O middleware é **otimista**: só verifica se o cookie de sessão existe, porque
validar contra o banco no edge custaria uma consulta por requisição. Quem valida
de fato é `requireUser()`, que **lança**.

Faltava alguém convertendo esse lançamento em redirect. Resultado medido:

| Requisição a `/` | Antes | Depois |
|------------------|-------|--------|
| Sem cookie | 307 → `/login` | 307 → `/login` |
| Cookie inválido | **500** (tela "Algo deu errado") | 307 → `/login` |

Acontece sempre que o cookie sobrevive à sessão: banco recriado no
desenvolvimento, sessão revogada em outro dispositivo, `BETTER_AUTH_SECRET`
trocado. O aluno via tela de erro sem saída — recarregar não resolvia, porque o
cookie continuava lá.

**Limpar o cookie é obrigatório, não opcional.** Só redirecionar pro `/login`
faria loop infinito: o middleware vê cookie em `/login` e devolve pra `/`, que
lança de novo. Por isso o destino é `/api/auth/sessao-invalida`, um route
handler — página e layout no App Router **não podem escrever cookie**, só
Server Action e route handler podem.

O gate mora no layout de `(orion)`, antes de qualquer JSX. Dentro de
`<Suspense>` o redirect chegaria depois do shell e viraria 200 — a mesma
armadilha de streaming documentada na [F028](F028-desempenho.md).

## Rate limit (F036 — 2026-08-13)

Login sem senha troca "adivinhar a senha" por "pedir muitos links". Nada limitava
quantas vezes um IP podia disparar magic link ou bater no callback — e cada
disparo é um e-mail enviado pela conta de e-mail transacional do projeto.

Config do Better Auth: **20 requisições por 60s, por IP**, nas rotas
`/api/auth/*`.

**O que isso não cobre, e é de propósito:** o limite vive no `onRequest` do
router HTTP do Better Auth. Chamada **server-side direta** a `auth.api.*` — que
é o que `requireUser()` faz a cada render de página protegida — não passa por
ali e não é limitada. Certo assim: essas chamadas já exigem cookie de sessão,
não são superfície anônima, e limitá-las derrubaria navegação legítima.

Ajuste dos números por spec. Referência pra calibrar: um login por magic link
consome ~3 requisições (envio, verify, callback).

## Decisões de implementação
- `src/lib/auth/` — config do Better Auth (adapter Prisma, providers) +
  `requireUser()`. Sem dep de Next na parte de domínio; o wiring de sessão fica
  na borda (middleware/route handlers).
- Middleware de proteção de rotas em `src/middleware.ts`.
- `src/app/(orion)/layout.tsx` — gate de sessão; `AuthError` vira redirect.
- `src/app/api/auth/sessao-invalida/route.ts` — limpa os cookies do Better Auth
  (inclusive o `session_data` do cookie cache e as variantes `__Secure-`) e
  manda pro `/login?error=sessao_expirada`.
- `src/app/login/page.tsx` (client: Google + magic link).
- Lib nova? **Sim** — `better-auth` ([ADR-007](../04-decisions/ADR-007-better-auth.md))
  e `nodemailer` para SMTP Resend
  ([ADR-010](../04-decisions/ADR-010-email-transacional.md)).

## Como testar (manual)
1. Preencher no `.env` as vars mínimas (`BETTER_AUTH_*` + e-mail). Secret:
   `openssl rand -base64 32`. Google OAuth é opcional (`GOOGLE_CLIENT_*`).
2. Com Google: no Cloud Console, redirect URI
   `{BETTER_AUTH_URL}/api/auth/callback/google`.
3. Aplicar migração: `npx prisma migrate deploy` (ou `npm run db:migrate`).
4. **Magic link local:** `docker compose up -d` (Mailpit) e
   `EMAIL_PROVIDER=mailpit` + `EMAIL_FROM` + `MAILPIT_URL=http://127.0.0.1:8025`
   ([ADR-010](../04-decisions/ADR-010-email-transacional.md)). UI: http://127.0.0.1:8025
   Em produção: `EMAIL_PROVIDER=resend` + `RESEND_SMTP_*`.
5. `npm run dev` — sem as envs de auth o boot deve falhar com mensagem clara.
6. Sem cookie: abrir `/`, `/leads`, `/treino`, `/configuracao` → redirect `/login`.
7. Google: entrar → 1ª vez cria User/Session (Prisma Studio / tabela `user`);
   segunda vez reusa o mesmo User.
8. Magic link: informar e-mail → estado "enviamos um link"; abrir o link no
   Mailpit (ou Resend em prod) → sessão. Reabrir o mesmo link → erro claro.
9. **Sair** na sidebar → rotas protegidas voltam a pedir login.
10. Em Server Action (quando F015 ligar): `await requireUser()` devolve o user
    ou lança `AuthError`.

## Fora do escopo (F014)
- E-mail+senha e "recuperar senha" (decidido: sem senha) — só como plano B de
  contingência (ADR-007), não default.
- Papéis/permissões (admin vs. aluno), times, convites → fase posterior.
- Escopar os **dados** por usuário → é a [F015](F015-multi-tenant.md).
- Billing/planos pagos.
