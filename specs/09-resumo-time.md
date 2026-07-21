# 09 — Resumo pro Time (handoff)

## Status
Handoff — 2026-07-13. Documento de comunicação pro time; a fonte da verdade
continua nas specs (00, 07, 08 e F014–F017). Atualizar quando o plano mudar.

---

## O que é
O **Orion** é um **motor de prospecção** que acha **negócios locais que já
precisam de um dev** e entrega o contato com a **Dor diagnosticada** e a
**mensagem de abordagem pronta**. Em vez de cuspir uma lista crua de contatos
(como os scrapers), ele **qualifica** cada Lead.

## Como funciona (o fluxo)
1. **Coleta** negócios por região/categoria via Google Places — dado público. `[F001]`
2. **Diagnostica** a presença digital: tem site? HTTPS? é rápido no mobile? `[F002/F008]`
3. **Detecta Dores** concretas: sem site, site lento, sem HTTPS… `[F002→F004]`
4. **Prioriza** com um score de 0–100. `[F003]`
5. **Gera o outreach** de WhatsApp pronto e personalizado, via Claude. `[F005]`
6. **Acompanha o funil** e ajuda a fechar: follow-up, objeções, proposta, roleplay
   de venda. `[F006/F010/F011/F012/F013]`

Resultado: **"Leads prontos"** — contato + Dor + abordagem, prontos pra enviar
**manualmente** (LGPD: só dado público, sem disparo em massa).

## O diferencial
Os concorrentes ou fazem **scraping cru + disparo em massa** (MapLeads) ou são
**caros/enterprise** (Apollo, Leads Per Hour). Nenhum entrega *contato + Dor
diagnosticada + outreach pronto*, por dado público (API oficial), dentro da LGPD,
a custo marginal. **O diagnóstico que qualifica é o núcleo.**
Ver [concorrentes](06-referencias/concorrentes.md).

## O que estamos construindo agora (Fase 2 — virar produto pros alunos)
Hoje é ferramenta interna de um operador só. Vamos transformar em **app hospedado
pros alunos**:
- **Login** por aluno (Google + magic link, sem senha).
- **Multi-tenant**: cada aluno vê só os seus dados.
- **BYOK** (*traga sua chave*): o aluno usa as próprias chaves de API → **o custo
  de API é dele**; o nosso é só hospedagem + banco.
- App hospedado (subdomínio Dev em Dobro), UI mais clean, Termos + Privacidade.

**Lançamento: 20/07/2026, ao vivo às 20h.** Como os bloqueadores são pesados, o
dia 20 é o **evento de lançamento na live + beta fechado** — não o SaaS 100%
completo. Ver [roadmap](07-lancamento-para-alunos.md).

---

## Próximas tarefas (na ordem)

> Regra do projeto: **spec é a fonte da verdade**. Cada tarefa tem spec pronta em
> `/specs`. Ler a spec antes de codar.

### 0. Antes de qualquer código
- [ ] Fechar o [ADR-011](04-decisions/ADR-011-multi-provider-llm.md): **interface
      própria vs. Vercel AI SDK** pro multi-provider (afeta só a F017, mas decidir cedo).
- [x] Domínio: `orion-lead-hunter.devemdobro.com` (Cloudflare + Vercel).

### 1. F015 — Multi-tenant (fundação de dados) — *fazer primeiro*
- [ ] `user_id` (FK) em Lead, Diagnóstico, Dor, Outreach + índices + migração com backfill.
- [ ] Toda query/Server Action filtra por `user_id` da sessão (helper único).
- [ ] `place_id` passa a ser `unique(user_id, place_id)`.
- [ ] **Teste de isolamento** (aluno A nunca vê dado de B).
- Spec: [F015](02-features/F015-multi-tenant.md) · [ADR-008](04-decisions/ADR-008-multi-tenant.md)

### 2. F014 — Autenticação (login)
- [ ] Better Auth + adapter Prisma (modelos User/Session/Account/Verification).
- [ ] Google OAuth + magic link; telas de login; middleware protegendo as rotas.
- [ ] Helper `requireUser()` que a F015 consome.
- Spec: [F014](02-features/F014-autenticacao.md) · [ADR-007](04-decisions/ADR-007-better-auth.md) · [ADR-010](04-decisions/ADR-010-email-transacional.md)

### 3. F016 — Configuração de chaves (BYOK) — *MVP só Google + Anthropic*
- [ ] Modelo `UserApiKeys` **cifrado** (AES-256-GCM).
- [ ] Tela `/configuracao`: input por chave, "testar chave", máscara, status.
- [ ] **Refactor central**: trocar `process.env.*` pela chave do aluno logado nas
      libs (places, pagespeed, outreach, conteúdo, diagnóstico-ux, proposta,
      objeções, simulador).
- Spec: [F016](02-features/F016-configuracao-de-chaves.md) · [ADR-009](04-decisions/ADR-009-cifra-chaves-byok.md)

### 4. UI clean do essencial
- [ ] Login, `/configuracao`, empty states/onboarding.

### 5. Deploy + domínio + segurança/LGPD
- [x] Domínio `orion-lead-hunter.devemdobro.com` + secrets/health (ver [07](07-lancamento-para-alunos.md) §§7–8).
- [x] Termos de Uso + Política de Privacidade (`/termos`, `/privacidade`).
- [x] F008 em serverless → ScreenshotOne via BYOK (ADR-006).
- [x] Neon de produção — migrations aplicadas no banco principal.

### 6. Beta fechado
- [ ] Abrir pra um grupo pequeno de alunos.

### Fast-follow (depois do beta)
- [F017](02-features/F017-multi-provider-llm.md) multi-provider (OpenAI/Gemini),
  [F004] persistir a Dor, redesign de UI, testes automatizados, observabilidade.

---

## Onde ler tudo
- **[08 — Briefing](08-briefing.md)** — resumo do produto.
- **[07 — Lançamento](07-lancamento-para-alunos.md)** — roadmap completo + decisões.
- **[00 — Product Vision](00-product-vision.md)** — visão (já atualizada pra Fase 2).
- **Specs** [F014](02-features/F014-autenticacao.md) · [F015](02-features/F015-multi-tenant.md) · [F016](02-features/F016-configuracao-de-chaves.md) · [F017](02-features/F017-multi-provider-llm.md)
- **ADRs** [007](04-decisions/ADR-007-better-auth.md) · [008](04-decisions/ADR-008-multi-tenant.md) · [009](04-decisions/ADR-009-cifra-chaves-byok.md) · [010](04-decisions/ADR-010-email-transacional.md) · [011](04-decisions/ADR-011-multi-provider-llm.md)
