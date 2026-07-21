# F007 — Sugestões de Vídeo-Funil (conteúdo inbound)

## Status
**Fora do menu (2026-07-20).** Código em `/conteudo` permanece no repo, mas a
aba foi removida da sidebar — produto foca no funil outbound. Reativar exige
recolocar o item no nav.

## Objetivo
Gerar **Ideias de Vídeo** pro seu canal de conteúdo (YouTube por padrão,
configurável em `src/lib/brand.ts`) que funcionam como **funil de
venda**: entregam valor real, atraem o público-alvo e encaminham o espectador
pro próximo passo (no fim, o **diagnóstico gratuito**). É o **pilar inbound** —
complementa (não substitui) a prospecção outbound do resto do produto. Ver nota
na [visão de produto](../00-product-vision.md).

Referências de formato: canais Nick Saraev e Well Pires — a fórmula
**gancho forte → valor real (tutorial/teardown/estudo de caso/desmistificação)
→ CTA pro próximo passo do funil**.

## Linguagem
- **Ideia de Vídeo**: uma sugestão estruturada de vídeo (título, formato, etc.).
  Não confundir com "roteiro" (a Ideia traz só um **esqueleto** de roteiro).
- **Etapa do funil**: `topo` (atrai amplo) · `meio` (educa/prova competência) ·
  `fundo` (caso/oferta → diagnóstico).

## Input (UI)
Página `/conteudo`, form com um campo:

| Campo  | Tipo   | Validação           | Exemplo                              |
|--------|--------|---------------------|--------------------------------------|
| `tema` | string | obrigatório, 2–120  | `automação de atendimento pra clínicas` |

Gera **5 Ideias** variando as etapas do funil.

## Saída (UI)
5 cards, cada um com:
- **título** (estilo YouTube, PT-BR)
- **formato/ângulo** (ex.: build-with-me, estudo de caso, desmistificação)
- **quem atrai** (o público)
- **etapa do funil** (topo/meio/fundo)
- **CTA** (conecta ao funil — topo/meio levam a lead magnet/seguir; fundo leva
  ao diagnóstico gratuito)
- **roteiro-esqueleto** (4–6 bullets: hook · problema · entrega · prova · CTA)

## Fluxo
1. Operador acessa `/conteudo`, preenche `tema`, clica **Gerar ideias**.
2. Server Action `sugerirVideosAction({ tema })`:
   1. Valida (Zod).
   2. `ANTHROPIC_API_KEY` ausente → `{ erro }` antes de qualquer chamada.
   3. Chama `src/lib/conteudo/sugerirVideos(tema)` → `IdeiaVideo[]` (Claude API,
      structured output — schema com array de ideias).
   4. Retorna `{ ideias }`.
3. UI renderiza os cards. **Sem persistência** nesta versão (gera e exibe).

## Critérios de aceitação
- [ ] **AC1** — `tema` válido retorna 5 Ideias, cada uma com título, formato,
      atrai, etapa, cta e roteiro (≥ 3 bullets).
- [ ] **AC2** — As 5 Ideias variam de etapa (não vêm todas `topo`); ao menos uma
      `fundo` com CTA pro diagnóstico gratuito.
- [ ] **AC3** — `tema` < 2 chars (Zod) → mensagem de erro na UI, sem chamar a
      Claude API.
- [ ] **AC4** — `ANTHROPIC_API_KEY` ausente → `{ erro }` descritivo, sem chamada.
- [ ] **AC5** — Falha da Claude API (refusal/`parsed_output` nulo) → `{ erro }`
      na UI, sem quebrar a app.
- [ ] **AC6** — Cada título é específico (benefício/curiosidade), não clickbait
      vazio; cada Ideia entrega valor real, não é só anúncio. (Validação manual.)

## Decisões de implementação
- `src/lib/conteudo/prompt.ts` — `IdeiaVideo` (tipo), `SYSTEM_PROMPT_CONTEUDO`
  (playbook de conteúdo/funil) e `montarTema(tema)`. Fonte única da estratégia.
- `src/lib/conteudo/sugerirVideos.ts` — cliente Claude (SDK, structured output
  com array); lança `ConteudoError`. Reusa [ADR-005](../04-decisions/ADR-005-anthropic-sdk-outreach.md)
  (sem lib nova).
- `src/actions/conteudo/sugerir.ts` — Server Action fina.
- `src/app/conteudo/page.tsx` + `sugerir-form.tsx` (client, form + cards).
- Sem schema/migração (não persiste). Modelo `claude-opus-4-8`.

## Fora do escopo (F007)
- **Persistência das Ideias** (entidade `IdeiaVideo` no domínio) + marcar
  "gravei/publiquei" → F-conteúdo-v2 (vira pipeline de conteúdo).
- Roteiro completo (só esqueleto), thumbnails, títulos A/B, tags/SEO.
- Outros canais (Reels/TikTok/Shorts), agendamento de publicação.
- Métricas de desempenho dos vídeos.

## Custo estimado
Uma geração Claude por clique, com saída maior (5 ideias) → ~R$0,10–0,20 por
geração (Opus 4.8). Uso esporádico → marginal, dentro do teto de R$50/mês.
Se virar uso intenso, avaliar `claude-haiku-4-5` por spec.
