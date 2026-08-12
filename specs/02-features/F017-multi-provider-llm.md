# F017 — Multi-provider LLM (Anthropic/OpenAI/Gemini)

## Status
Implementada — 2026-07-15

## Objetivo
Deixar o aluno **escolher o provedor de IA** — Anthropic, OpenAI ou Gemini —
no **modo BYOK**, usando a **própria chave** ([F016](F016-configuracao-de-chaves.md)).
No **modo Orion** ([F018](F018-limites-diarios.md)), as features de IA usam
**OpenAI** com `ORION_OPENAI_API_KEY` (sem escolha de provider na UI) — **não**
usam Gemini. Chave Gemini do aluno só entra no **modo BYOK** com provider =
Gemini.

Abordagem técnica em [ADR-011](../04-decisions/ADR-011-multi-provider-llm.md):
**fachada `src/lib/llm/` sobre o Vercel AI SDK**. Todas as features mantêm
**structured output** e **visão**.

## Escopo
- Provider selecionável em `/configuracao` (`llm_provider` em `UserApiKeys`).
- Default: **Anthropic**.
- OpenAI e Gemini usam as chaves já guardadas na F016.
- **Gemini thinking:** modelos 2.5/3.x contam tokens de raciocínio no
  `maxOutputTokens`. A fachada desliga thinking (`thinkingBudget: 0`) em
  gerações estruturadas e amplia o teto, senão a API devolve HTTP 200 com
  texto vazio → erro tipo “No output generated”.

## Camada de abstração
`LlmClient` em `src/lib/llm/`:
- `generateText(...)`
- `generateStructured(schema Zod)`
- `generateVisionStructured(imagens, schema Zod)` — F008

Factory `createLlmForUser(userId)` resolve provider + chave BYOK e devolve o
cliente. Features não tocam SDK de provider.

## Critérios de aceitação
- [x] **AC1** — Com provider = Anthropic, features de IA seguem o fluxo
      (via AI SDK; mesma chave/BYOK).
- [x] **AC2** — Trocar o provider na `/configuracao` faz as features usarem o
      provedor escolhido, com a chave do aluno (F016).
- [x] **AC3** — **Structured output** funciona nos 3 provedores para os schemas
      já usados (outreach, proposta, objeções, scorecard, ideias, UX).
- [x] **AC4** — **Visão** (F008) via `generateVisionStructured`; falha com
      `LlmError` claro se o provedor/modelo rejeitar.
- [x] **AC5** — Chave/permissão inválida → `LlmError` / mensagem amigável.
- [x] **AC6** — Features não importam `@anthropic-ai/sdk` / `@ai-sdk/*` direto —
      só `src/lib/llm`.

## Decisões de implementação
- Libs: `ai`, `@ai-sdk/anthropic`, `@ai-sdk/openai`, `@ai-sdk/google` (ADR-011).
- `UserApiKeys.llm_provider` enum (`anthropic` | `openai` | `gemini`).
- Tiers de modelo: `strong` / `fast` (mapa por provider em `src/lib/llm/modelos.ts`).

## Como testar
1. `/configuracao` — salvar chave Gemini (ou OpenAI) + escolher o provider
2. Gerar Outreach / Ideias / Treino — deve usar o provedor escolhido
3. Voltar para Anthropic — features voltam a Claude

## Fora do escopo (F017)
- Roteamento automático/fallback entre provedores.
- Comparação de custo/qualidade na UI.
- Grok e outros provedores.
