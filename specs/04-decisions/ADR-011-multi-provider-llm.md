# ADR-011 — Camada multi-provider de LLM (Anthropic/OpenAI/Gemini)

## Status
Aceito — 2026-07-15 (implementação na [F017](../02-features/F017-multi-provider-llm.md))

## Contexto
Hoje **tudo** usa o `@anthropic-ai/sdk` ([ADR-005](ADR-005-anthropic-sdk-outreach.md))
com **structured output** (Zod/JSON Schema) e **visão** (F008). A Fase 2 quer que
o aluno escolha entre **Anthropic, OpenAI e Gemini** ([F017](../02-features/F017-multi-provider-llm.md)),
usando a **própria chave** (BYOK). Suportar 3 provedores exige uma **camada de
abstração** e introduz **libs novas** → ADR.

O ponto difícil não é texto: é **paridade de structured output + visão** nos 3.

## Decisão
**Fachada própria** `src/lib/llm/` **sobre o Vercel AI SDK** (`ai` +
`@ai-sdk/anthropic` / `@ai-sdk/openai` / `@ai-sdk/google`).

- Interface `LlmClient`: `generateText`, `generateStructured(schema Zod)` e
  `generateVisionStructured(imagens, schema)`.
- Adapters via `createAnthropic` / `createOpenAI` / `createGoogle` com a chave
  BYOK do aluno ([F016](../02-features/F016-configuracao-de-chaves.md)).
- Provider escolhido pelo aluno em `/configuracao` (`UserApiKeys.llm_provider`,
  default `anthropic`).
- Features de IA **não** importam SDK de provider — só a fachada.
- Modelos por tier: `strong` (qualidade) e `fast` (barato/rápido). Anthropic
  permanece a referência de qualidade quando escolhido.

## Alternativas consideradas
- **Manter só Anthropic**: não atende o requisito de escolha do aluno.
- **Interface-própria com SDKs crús** (`@anthropic-ai/sdk`, `openai`, SDK Gemini):
  mais controle fino, mas triplica o trabalho de structured output + visão. O
  AI SDK já unifica isso.
- **LangChain**: rejeitado — peso e abstrações demais pro escopo.

## Consequências
### Positivas
- Aluno usa o provedor que já tem/prefere.
- Uma API só no app; diffs de provider ficam no AI SDK.
- Structured output + visão com Zod nos 3 providers.

### Negativas / a aceitar
- Dependência do `ai` (e adapters). Aceito — menos código de paridade nosso.
- Quirks de schema/modelo por provider ainda existem; erros viram `LlmError`
  com orientação clara.
- `@anthropic-ai/sdk` direto deixa de ser o caminho das features (ADR-005
  continua válido como histórico do MVP; o runtime passa pela fachada).
