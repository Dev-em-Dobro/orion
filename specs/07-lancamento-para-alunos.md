# 07 — Lançamento para Alunos (Fase 2)

## Status
Proposta — 2026-07-12 · decisões fechadas em 2026-07-13.

## Meta de lançamento
**20/07/2026, ao vivo às 20h** (alunos Dev em Dobro). Com os bloqueadores abaixo
(auth, multi-tenant, BYOK, deploy, LGPD — cada um **G**), 7 dias é apertado pro
SaaS completo: tratar o dia 20 como o **evento de lançamento na live** e mirar
**beta fechado** primeiro, priorizando o caminho crítico e empurrando o resto
pra fast-follow. Ver o [briefing](08-briefing.md).

## Contexto — a mudança de premissa
Hoje o produto é **ferramenta interna**: um operador, sem login, self-hosted,
chaves de API no `.env` (ver [visão](00-product-vision.md) e `CLAUDE.md`).

A meta agora é **liberar para alunos**: um app **hospedado**, cada aluno faz
**login** e usa as **próprias chaves** (modelo BYOK — *bring your own key*). 

> **Governança (regra do projeto).** Antes de qualquer código desta fase:
> 1. Atualizar `00-product-vision.md` e `CLAUDE.md` (deixam de valer "ferramenta
>    interna / sem auth / sem multi-tenant").
> 2. Abrir os ADRs necessários (Better Auth, multi-tenant, BYOK/cifra de chaves,
>    multi-provider LLM). "Sem nova lib sem ADR."
> 3. Cada bloco abaixo vira **spec própria** (`F0XX`) antes de implementar.

## Legenda
Esforço: **P** (< 1 dia) · **M** (1–3 dias) · **G** (> 3 dias).
Bloqueia o lançamento: 🚫 sim · ⭐ desejável (pode ser fast-follow).

## Visão geral

| # | Workstream | Proposta | Bloqueia? | Esforço |
|---|------------|----------|-----------|---------|
| 1 | Autenticação (login) | F014 · ADR Better Auth | 🚫 | G |
| 2 | Multi-tenant (isolamento por aluno) | F015 · ADR | 🚫 | G |
| 3 | Configuração de chaves do aluno (BYOK) | F016 · ADR cifra | 🚫 | G |
| 4 | Multi-provider LLM (Anthropic/OpenAI/Gemini) | F017 · ADR | ⭐ | G |
| 5 | Spec faltante — Dor (detecção/persistência) | F004 | ⭐ | M |
| 6 | UI/UX mais clean (redesign) | — | ⭐ | M–G |
| 7 | Deploy + domínio final | — · ops | 🚫 | M |
| 8 | Segurança / LGPD / legal | — | 🚫 | M |
| 9 | Dívida técnica / polish | — | ⭐ | P |

---

## 1. Autenticação — login (F014)
Novo lib → **ADR Better Auth** (métodos, sessão, adapter Prisma).

- [ ] ADR: Better Auth + adapter Prisma/Neon; métodos: **Google OAuth + magic link**
      (sem senha; exige provedor de e-mail transacional).
- [ ] Modelos de auth no schema (User/Session/Account/Verification).
- [ ] Telas: login/cadastro (Google + magic link), aguardando verificação de e-mail, logout.
- [ ] Middleware protegendo `/`, `/leads`, `/conteudo`, `/treino`, `/configuracao`.
- [ ] Server Actions passam a exigir sessão (helper `requireUser()`).

## 2. Multi-tenant — isolamento por aluno (F015)
**Fundação de dados.** Hoje todas as queries são globais; precisam ser escopadas
por `user_id`. É pré-requisito de tudo (sem isso, um aluno vê os Leads do outro).

- [ ] `user_id` (FK) em **Lead, Diagnostico, Dor, Abordagem** (+ índices) e migração.
- [ ] Toda query/Server Action filtra por `user_id` da sessão (coletar, diagnosticar,
      priorizar, abordagem, follow-up, desfecho, proposta, objeções, dashboard, treino).
- [ ] Dashboard de funil (F010) e `/treino` passam a ler só os dados do aluno logado.
- [ ] Revisar `revalidatePath` e caches pra não vazar entre usuários.
- [ ] Teste de isolamento (aluno A nunca acessa dado de B).

## 3. Configuração de chaves do aluno — BYOK (F016)
Menu **/configuracao** onde o aluno cola as próprias chaves. Substitui o `.env`
global como fonte das chaves. **Vantagem do BYOK:** o custo de API é do aluno —
o nosso custo fica só em hospedagem + banco.

Chaves a suportar:
- **Google** — Places API (New) + PageSpeed (pode ser a mesma chave Cloud).
- **Provedor de IA** — Anthropic, OpenAI e/ou Gemini (ver F017).
- **ScreenshotOne** (opcional) — necessária pro Diagnóstico UX (F008) em produção
  serverless, onde Playwright/Chromium não roda (ver [ADR-006](04-decisions/ADR-006-screenshot-api-externa.md)).

Tarefas:
- [ ] ADR: **cifra das chaves em repouso** (ex.: AES-GCM com chave do servidor / KMS)
      — nunca guardar em texto puro; nunca expor ao client.
- [ ] Modelo `UserApiKeys` (por usuário, cifrado) + migração.
- [ ] Tela `/configuracao`: inputs por chave, "testar chave" (ping barato), máscara,
      status (configurada / inválida / faltando).
- [ ] **Refactor central:** trocar `process.env.GOOGLE_PLACES_API_KEY /
      PAGESPEED_API_KEY / ANTHROPIC_API_KEY` por leitura da chave **do usuário atual**
      em: `places/textSearch`, `pagespeed/performanceMobile`, `abordagem`, `conteudo`,
      `diagnostico-ux`, `proposta`, `objecoes`, `simulador`. (Hoje as libs leem
      `process.env` direto — passar a chave por parâmetro/contexto.)
- [ ] Onboarding: se faltam chaves essenciais, guiar o aluno pro `/configuracao`
      (banner + estado vazio explicativo). Reaproveitar o tutorial do Google Places.
- [ ] Mensagem de erro clara por feature quando a chave está ausente/ inválida
      (já existe o padrão "X não configurada").

## 4. Multi-provider LLM (F017)
Hoje **tudo** usa o Anthropic SDK (`claude-opus-4-8` / `claude-haiku-4-5`) com
structured output e visão (F008). Suportar **OpenAI e Gemini** exige uma
**camada de abstração** de provider.

- [ ] ADR: interface única de LLM — geração de texto, **structured output**
      (JSON Schema) e **visão** (imagem, usada na F008). Mapear diferenças
      (OpenAI structured outputs, Gemini `responseSchema`).
- [ ] Adapter por provider + seleção de modelo; Anthropic segue como **referência/default**.
- [ ] Aluno escolhe o provider no `/configuracao`; features usam o provider dele.
- [ ] Paridade de qualidade: garantir structured output e visão em cada provider
      (o ponto mais difícil; faseado: MVP com Anthropic, depois OpenAI e Gemini).

> Nota: paridade de **visão + structured output** nos 3 provedores é o item mais
> caro daqui. Recomendo lançar o MVP só com Anthropic e adicionar **OpenAI** e
> **Gemini** como fast-follow (a config já aceita as 3 chaves desde o início).

## 5. Spec faltante — Dor (F004)
Único item de **dívida de spec** fechado: a entidade `Dor` existia no schema mas
**nada a criava**. F003/F005/F011/F012 derivavam do Diagnóstico via
`derivarDoDiagnostico`.

- [x] Escrever `specs/02-features/F004-deteccao-de-dor.md`.
- [x] Persistir `Dor` no passo do Diagnóstico (F002) e migrar as fontes que
      liam o Diagnóstico direto (F005, F011, F012, F013; F003 permanece no
      Diagnóstico até evolução própria).

## 6. UI/UX mais clean
Redesign pra cara de produto (hoje é dashboard funcional interna).

- [ ] Definir direção visual (usar a skill `ui-ux-pro-max`): paleta, tipografia,
      espaçamento, componentes shadcn/ui consistentes.
- [ ] Onboarding/empty states (primeiro acesso, sem Leads, sem chaves).
- [ ] Página `/configuracao` bem resolvida (é a primeira tela do aluno).
- [ ] Responsivo mobile de verdade; loading/skeletons; feedback de erro amigável.
- [ ] Landing/login com identidade da marca final.

## 7. Deploy + domínio final
- [x] Hospedagem **Vercel** — F008: Playwright local; em prod (serverless)
      ScreenshotOne via BYOK (ADR-006 / F016). Código: `screenshot.ts` + aviso
      em `/configuracao`. Health: `GET /api/health`.
- [x] Neon de produção + `prisma migrate deploy` — migrations aplicadas no banco
      principal (ops). Backups seguem no Neon. Checklist no `README.md` § Deploy.
- [x] Secrets do servidor sem default — `BYOK_MASTER_KEY`, `BETTER_AUTH_SECRET`,
      `BETTER_AUTH_URL`, `DATABASE_URL` validados no boot (`instrumentation.ts` +
      `src/lib/seguranca/env-servidor.ts`) e em `/api/health` (503 se faltar).
- [x] **Domínio de produção** — `orion-lead-hunter.devemdobro.com` (DNS Cloudflare
      + Vercel, HTTPS). `BETTER_AUTH_URL` em prod deve apontar para
      `https://orion-lead-hunter.devemdobro.com`.
- [x] `.vercelignore` existe; vars documentadas em `.env.example` + README.

## 8. Segurança / LGPD / legal
Agora há **usuários externos + chaves + dados** — o risco muda de patamar.

- [x] Cifra das chaves em repouso (F016 / ADR-009) e nunca logar segredo.
- [x] Isolamento de dados por usuário testado (F015 + E2E isolamento).
- [x] **Termos de Uso + Política de Privacidade** — rotas públicas `/termos` e
      `/privacidade` (contato em `src/lib/legal.ts`).
- [x] LGPD: privacidade descreve PII de conta, chaves BYOK cifradas, Leads só
      com **dado público** (Places); envio de Abordagem permanece manual.
- [x] Limites anti-abuso do recurso **compartilhado** — F018: cotas diárias no
      modo Orion (coleta, proposta, abordagem, simulador); BYOK sem cotas.
- [x] Chaves Orion por padrão (`ORION_*` env) + toggle BYOK em `/configuracao`.

## 9. Dívida técnica / polish
- [x] **Fix arredondamento da faixa de preço (F012)** — `arredondar50` arredonda
      o float antes do `/50` (`src/lib/proposta/precos.ts`); regressão coberta em
      `tests/unit/proposta.test.ts`.
- [x] Testes automatizados unitários — **Vitest** ([ADR-012](04-decisions/ADR-012-vitest-unitarios.md)):
      `npm test` cobre score, precos/servicos, cifra BYOK, máscara, mensagemEscopo,
      secrets (`tests/unit/`). E2E de isolamento F015 permanece separado.
- [x] Observabilidade mínima de **erros** — Sentry (`@sentry/nextjs`,
      [ADR-013](04-decisions/ADR-013-observabilidade.md)): client + server,
      `error.tsx` / `global-error.tsx`, `reportarErro` / `setSentryUser`. Sem DSN
      ⇒ no-op. PostHog (uso/quotas) fica fast-follow.
- [ ] Persistência opcional de F007 (Ideias de Vídeo) e F008 (Diagnóstico UX) —
      hoje deferidas; avaliar se entram no produto pro aluno.

---

## Decisões tomadas

### 2026-07-12
- **Auth:** **Better Auth** (confirmado).
- **Provedores de IA:** **Anthropic, OpenAI e Gemini** (Grok fora de escopo). A
  config (F016) aceita as 3 chaves; o uso efetivo de OpenAI/Gemini é a F017.

### 2026-07-13
- **Hospedagem:** **um único app compartilhado multi-tenant (SaaS).** Self-host
  deixa de ser alvo suportado — o código segue genérico, mas sem investir nisso.
- **Cifra das chaves (F016):** **chave-mestra em env var do servidor (Vercel
  Secret) com AES-256-GCM** no MVP; KMS gerenciado fica como evolução pós-beta.
  O ADR deve abstrair a cifra atrás de uma interface (padrão *envelope*) pra
  trocar env-var → KMS sem mexer nos call sites. Fixar no ADR: chave de 32 bytes,
  IV/nonce aleatório por registro, guardar `IV + ciphertext + auth tag`, coluna
  de versão de chave (rotação) e **nunca logar segredo**.
- **Banco:** **multi-tenant compartilhado por `user_id`** (tenancy por linha),
  um schema — como o F015 já propõe. Nada de schema/DB por aluno.
- **Login (Better Auth):** **Google OAuth (principal) + magic link; sem senha.**
  Exige provedor de e-mail transacional (ex.: Resend). Plano B, se não quiser
  depender de deliverability no dia 1: Google OAuth + e-mail/senha.
- **Limites por aluno:** **sim** — limites diários por usuário via tabela
  contadora no banco (`user_id, data, ação, contador`), sem Redis (casa com
  "sem workers"). Partida (configurável por env/plano): ~50 coletas/dia,
  ~200 diagnósticos/dia, ~100 gerações LLM/dia. Monitorar no PostHog e afrouxar
  conforme o uso real.
- **Nome do produto:** **Orion** (o caçador da mitologia grega / a constelação —
  "caça" os Leads e "varre o céu" atrás deles). O app fica em **subdomínio Dev em
  Dobro** (ex.: `orion.devemdobro.com`).

### 2026-07-15
- **Domínio:** subdomínio Dev em Dobro
  **`https://orion-lead-hunter.devemdobro.com`** — DNS na Cloudflare, app na
  Vercel (HTTPS). Produção: `BETTER_AUTH_URL` = essa URL (sem barra no fim).

## Decisões em aberto (precisam da sua definição)
_Nenhuma no momento._ (Marca/oferta em `src/lib/brand.ts` continua editável
pelo operador; não bloqueia o domínio.)

## MVP — caminho crítico (o mínimo pra abrir)
Ordem sugerida (bloqueadores primeiro):
1. Atualizar visão + `CLAUDE.md` + ADRs (auth, multi-tenant, BYOK).
2. **F015 multi-tenant** (fundação de dados) → **F014 auth** → **F016 BYOK** +
   refactor `process.env` → chave do usuário (só **Google + Anthropic** no MVP).
3. **UI clean** do essencial (login, `/configuracao`, empty states).
4. **Deploy + domínio + segurança/LGPD** (Termos + Privacidade, cifra, isolamento).
5. **Beta fechado** com um grupo pequeno de alunos.

**Fast-follow (pós-MVP):** F017 multi-provider (OpenAI/Gemini), F004 Dor,
polish de UI, testes, persistências opcionais.

> Resumindo o que **bloqueia** o lançamento: auth (F014) + multi-tenant (F015) +
> BYOK (F016) + deploy/domínio + segurança/LGPD. O resto (multi-provider, F004,
> redesign completo) melhora o produto mas pode vir logo depois do beta.
