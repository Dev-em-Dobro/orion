# F008 — Diagnóstico UX via IA (Nível 2: screenshot + visão)

## Status
Proposta — 2026-06-12

## Objetivo
Gerar uma análise de UX/UI do site de um Lead a partir de **screenshots
reais** (desktop e mobile) avaliados pela Claude API com visão. O
resultado é o artefato do "diagnóstico gratuito" da oferta: uma lista de
problemas concretos, em linguagem de dono de negócio, pronta pra ser
enviada ao Lead e alimentar a conversa de Outreach.

Complementa a F002: o Diagnóstico de presença digital mede o site por
fora (existe? HTTPS? performance); a F008 olha o site como um usuário —
aparência, clareza, chamada pra ação, experiência mobile.

## Input (UI)
> **Pausa (2026-07-20):** o botão **não está exposto na UI** por hora
> (detalhe do Lead em `/leads`). Código da Server Action e do componente
> permanecem; reativar quando a feature voltar ao fluxo do operador.

Botão **Diagnóstico UX** (quando reativado) no detalhe do Lead em
`/leads`, visível apenas para Leads com `website` não-nulo.

Input da Server Action:

| Campo     | Tipo   | Validação                |
|-----------|--------|--------------------------|
| `lead_id` | string | obrigatório, cuid válido |

## Saída (UI)
Painel abaixo do botão com:
- **Resumo** (2–3 frases) da impressão geral do site.
- **Problemas** (3–6), cada um com `titulo`, `severidade`
  (`ALTA | MEDIA | BAIXA` — mesma escala de Severidade do domínio) e
  `detalhe` em linguagem simples.
- **Pontos positivos** (0–3) — honestidade aumenta a credibilidade do
  diagnóstico enviado ao Lead.
- Botão **Copiar** que copia o diagnóstico formatado em texto plano
  (pronto pra colar no WhatsApp).

## Fluxo
1. Operador clica em **Diagnóstico UX** na linha do Lead.
2. Server Action `diagnosticarUx({ lead_id })`:
   1. Valida input com Zod. Lead inexistente → `{ erro }`.
   2. `Lead.website` nulo → `{ erro: "Lead sem site — Diagnóstico UX exige website" }`.
   3. Checa `ANTHROPIC_API_KEY`; ausência → erro descritivo, sem chamada
      externa.
   4. Captura **2 screenshots** via `src/lib/diagnostico-ux/screenshot.ts`:
      desktop 1280×800 e mobile (device iPhone emulado). Provider
      (ADR-006): `SCREENSHOTONE_ACCESS_KEY` definida → ScreenshotOne;
      ausente → **Playwright local** (Chromium headless, um browser pros
      dois shots). Falha em qualquer um → `{ erro }`.
   5. Chama `src/lib/diagnostico-ux/analisarUx.ts`: Claude API com as duas
      imagens (base64) + nome/categoria do Lead, structured output
      `{ resumo, problemas[], pontos_positivos[] }`.
   6. Retorna o resultado. **Nada é persistido** (ver Fora do escopo).
3. UI renderiza o painel.

## Modelo e prompt
- Model: **`claude-haiku-4-5`** — análise de checklist visual não exige
  Opus; custo ~US$0,01/diagnóstico (decisão de custo; trocar de modelo é
  trocar uma string em `analisarUx.ts`).
- `thinking: { type: "disabled" }`, `max_tokens: 2048`.
- System prompt: consultor de UX sênior avaliando o site de um
  estabelecimento local; reportar só o que é visível nos screenshots
  (proibido inventar); linguagem simples, sem jargão; foco em conversão
  (o visitante entende o que é? acha o contato? confia?).

## Duração da operação
Launch do Chromium (~1–3s) + 2 page loads (~5–15s) + Claude (~5–10s) ≈
**~25s** no pior caso. Dentro do padrão da F002.

## Critérios de aceitação
- [ ] **AC1** — Lead com site no ar → painel com resumo, 3–6 problemas
      com severidade e detalhe, e pontos positivos.
- [ ] **AC2** — Lead com `website = null` → botão não aparece; chamada
      direta da action retorna erro descritivo sem chamadas externas.
- [ ] **AC3** — Sem `SCREENSHOTONE_ACCESS_KEY` **e** sem o Chromium do
      Playwright instalado → erro descritivo orientando rodar
      `npx playwright install chromium`, sem chamada externa.
- [ ] **AC4** — `ANTHROPIC_API_KEY` ausente → erro descritivo sem
      chamada externa.
- [ ] **AC5** — Falha de screenshot (site fora do ar, erro da API) →
      `{ erro }` na UI, sem quebrar a aplicação e sem chamar a Claude API.
- [ ] **AC6** — Nenhum registro é criado no banco; re-executar gera nova
      análise do zero.
- [ ] **AC7** — Botão **Copiar** coloca no clipboard o texto formatado
      (resumo + problemas numerados + pontos positivos).

## Decisões de implementação
- `src/lib/diagnostico-ux/` — screenshot + análise, sem dependência de
  Next (padrão de `lib/`).
- Screenshot via **Playwright** (provider primário, Fase 1 local), com
  ScreenshotOne como provider alternativo atrás de env —
  [ADR-006](../04-decisions/ADR-006-screenshot-api-externa.md).
  `capturarScreenshots(url)` retorna os dois shots e esconde o provider.
- Claude via SDK oficial, mesmo padrão da F005 (ADR-005): structured
  output, erros tipados.
- Server Action em `src/actions/leads/diagnosticarUx.ts`, fina.
- Envs: `ANTHROPIC_API_KEY` (já existe); `SCREENSHOTONE_ACCESS_KEY`
  **opcional** (ativa o provider externo — obrigatória só em deploy
  serverless).
- Setup local (uma vez): `npx playwright install chromium`.

## Fora do escopo (F008)
- **Persistência da análise** (modelo `DiagnosticoUx` ou extensão de
  `Diagnostico`) — exigiria migração e decisão de como o score consome o
  resultado; especar como F008.1 quando o fluxo provar valor na prática.
- Influência no score / geração de `Dor` a partir dos achados → junto
  com F008.1/F004.
- Nível 1 (análise de HTML/links sem browser) — pulado em favor do
  Nível 2; reabrir se o custo/limite de screenshots incomodar.
- Nível 3 (computer use navegando o site) — custo não justifica em
  volume de prospecção.
- Anexar o screenshot ao diagnóstico enviado ao Lead (exigiria storage).

## Custo estimado (junho/2026)
| Recurso                      | Custo                                         |
|------------------------------|-----------------------------------------------|
| Playwright local (Fase 1)    | R$0, ilimitado                                |
| Claude Haiku 4.5             | ~US$0,01/diagnóstico (≈6k tokens in + 1k out) |
| ScreenshotOne (só em deploy) | free tier 100/mês; depois ~US$17/mês          |

~100 diagnósticos/mês rodando local → **~US$1/mês** (só Claude).
