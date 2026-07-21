# ADR-010 — E-mail transacional (Resend) para magic link

## Status
Aceito — 2026-07-13 · atualizado 2026-07-14 (SMTP Resend no lugar do SDK)

## Contexto
O login por **magic link** ([ADR-007](ADR-007-better-auth.md)) exige **enviar
e-mail transacional** (o link de acesso). É uma **lib/serviço novo** → ADR. É
**infra nossa** (não BYOK): a chave do provedor é do servidor, não do aluno.

## Decisão
Adotar o **Resend** como provedor de e-mail transacional **em produção**,
isolado em `src/lib/email/`, via **SMTP** (não pela API/SDK do Resend).

- Cliente SMTP: **`nodemailer`**.
- Credenciais e endpoint só no servidor, nunca client, nunca commitados:
  - `RESEND_SMTP_FROM_EMAIL`
  - `RESEND_SMTP_HOST` (ex.: `smtp.resend.com`)
  - `RESEND_SMTP_PORT` (ex.: `465`)
  - `RESEND_SMTP_USER` (ex.: `resend`)
  - `RESEND_SMTP_PASS` (API key do Resend usada como senha SMTP)
- Envio a partir de um **domínio verificado** (subdomínio Dev em Dobro), com
  **SPF/DKIM** configurados pra deliverability.
- Uso na Fase 2: **magic link** (obrigatório) e, se necessário, notificações
  transacionais pontuais. **Nada de marketing/disparo em massa** (mantém o
  princípio anti-spam da visão).
- Free tier cobre o volume de um beta; reavaliar se escalar.

### Dev local — Mailpit (Docker Compose)
Para testar o magic link **sem** configurar Resend, o envio local usa
**Mailpit** via `docker compose` (UI em `:8025`, SMTP em `:1025`).

- `EMAIL_PROVIDER=mailpit` → API HTTP do Mailpit (`POST /api/v1/send`) +
  `EMAIL_FROM` + `MAILPIT_URL`.
- `EMAIL_PROVIDER=resend` → SMTP Resend com as envs `RESEND_SMTP_*` acima.

## Alternativas consideradas
- **SDK `resend` (API HTTP)**: rejeitado nesta revisão — preferimos SMTP com
  as mesmas credenciais, alinhado ao formato de envs do time e sem acoplar ao
  SDK.
- **SMTP próprio (servidor nosso) + Nodemailer**: exige gerir deliverability
  (reputação de IP, blocklists) — trabalho que o Resend abstrai; Nodemailer
  fica só como **cliente** falando com o SMTP do Resend.
- **AWS SES / Postmark / SendGrid**: equivalentes; Resend permanece o provedor.

## Consequências
### Positivas
- Magic link viável com pouco código; deliverability gerenciada pelo Resend.
- Uma dependência pequena (`nodemailer`) isolada em `src/lib/email/`.
- Envs SMTP explícitas e padronizadas.

### Negativas / a aceitar
- **Deliverability depende de config de domínio** (SPF/DKIM) — se o e-mail
  atrasar/cair no spam, o login trava. Mitigar com domínio verificado e teste
  antes do lançamento; plano B de e-mail+senha continua disponível (ADR-007).
- Mais um serviço externo/conta a gerenciar.
- Dev local exige Docker (Mailpit) se for testar magic link — aceitável; Google
  OAuth cobre login sem e-mail.
