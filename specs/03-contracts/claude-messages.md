# Contrato — Claude API (Messages) para Abordagem

Usado pela F005. Decisão de adotar o SDK em
[`ADR-005`](../04-decisions/ADR-005-anthropic-sdk-abordagem.md).

## SDK
`@anthropic-ai/sdk` (oficial). Cliente em `src/lib/abordagem/`, sem dep de Next.

```ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // lê ANTHROPIC_API_KEY do env
```

## Autenticação
- `process.env.ANTHROPIC_API_KEY`. O SDK lê automaticamente; a lib checa a
  ausência **antes** de instanciar para devolver erro descritivo
  (`"ANTHROPIC_API_KEY não configurada"`), no padrão da F001/F002.

## Modelo
- **`claude-opus-4-8`** — id exato, **sem sufixo de data**.
- Migração futura de modelo = trocar essa string. Não usar `budget_tokens`,
  `temperature`, `top_p` (removidos nessa família → 400).

## Chamada (structured output)
```ts
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";

const AbordagemSchema = z.object({ mensagem: z.string() });

const res = await client.messages.parse({
  model: "claude-opus-4-8",
  max_tokens: 1024,
  thinking: { type: "disabled" },
  system: SYSTEM_PROMPT,            // playbook de conversão (ver F005)
  messages: [{ role: "user", content: contextoDoLead }],
  output_config: { format: zodOutputFormat(AbordagemSchema, "abordagem") },
});

const out = res.parsed_output;       // { mensagem } | null
```

- `parsed_output` pode vir `null` (ex.: `stop_reason: "refusal"` ou
  `max_tokens`). Tratar como erro e **não** persistir Abordagem.
- `max_tokens: 1024` é folgado para uma mensagem de WhatsApp (~70 palavras);
  request não-streaming (bem abaixo do limite de ~16k).
- `thinking: { type: "disabled" }` é aceito no Opus 4.8. O structured output
  garante que a saída seja só o JSON do schema (sem preâmbulo/raciocínio).

## Erros relevantes
| Classe SDK                      | Status | Tratamento |
|---------------------------------|--------|------------|
| `Anthropic.AuthenticationError` | 401    | Chave inválida → erro descritivo na UI |
| `Anthropic.PermissionDeniedError` | 403  | Sem acesso ao modelo → erro na UI |
| `Anthropic.RateLimitError`      | 429    | SDK já faz retry; se estourar, erro "tente novamente" |
| `Anthropic.APIError`            | 5xx    | Erro genérico na UI |

A lib lança `AbordagemError` tipado; a Server Action (F005) traduz pra mensagem
da UI, sem quebrar a aplicação.

## Custo estimado (junho/2026)
Opus 4.8: input **$5 / 1M**, output **$25 / 1M**.

| Parte    | Tokens aprox. | Custo |
|----------|---------------|-------|
| Entrada (system + contexto do Lead) | ~800  | ~$0,004 |
| Saída (mensagem)                    | ~200  | ~$0,005 |
| **Por Abordagem**                    | —     | **~$0,009 ≈ R$0,05** |

A ~100 Abordagens/mês ≈ **R$5/mês** — confortavelmente dentro do teto de
R$50/mês da visão. Se o volume crescer muito, avaliar por spec trocar o modelo
para `claude-haiku-4-5` (1/5 do custo) — decisão de custo é do operador, não
default silencioso.

## Fora deste contrato
- Streaming (a saída é curta; não necessário).
- Tool use / agents (geração de texto único).
- Batches (envio é Lead a Lead, manual).
