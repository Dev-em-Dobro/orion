# ADR-005 — SDK oficial da Anthropic para a Abordagem

## Status
Aceito — 2026-06-12

## Contexto
A F005 (Abordagem) gera a mensagem de abordagem via Claude API. É a primeira
integração com a Claude API no projeto e introduz uma **lib nova** — o que,
pela regra do `CLAUDE.md` ("Sem nova lib sem ADR"), exige esta decisão.

As duas integrações externas atuais (Google Places na F001, PageSpeed na F002)
usam `fetch` nativo, sem SDK. Poderíamos seguir o mesmo padrão e chamar
`POST /v1/messages` na unha. Porém a chamada da Claude API aqui é mais
envolvida que um GET: precisamos de **structured output** (garantir que a
resposta seja um JSON `{ mensagem }` sem preâmbulo), tratamento de erros
tipados (429/5xx/refusal) e o model id correto.

## Decisão
Adotar o **SDK oficial `@anthropic-ai/sdk`** para a integração com a Claude API,
isolado em `src/lib/abordagem/` (sem dependência de Next, como toda lib de
domínio).

- Model: **`claude-opus-4-8`** (id exato, sem sufixo de data).
- Structured output via `client.messages.parse()` + `zodOutputFormat` — a
  resposta é validada contra um schema Zod, eliminando parsing manual e
  preâmbulos.
- `thinking: { type: "disabled" }` — a geração de copy curta não justifica
  thinking; reduz custo e latência. O structured output já restringe a saída
  ao JSON, então não há risco de "vazar" raciocínio no texto.
- Chave lida exclusivamente de `process.env.ANTHROPIC_API_KEY` (o SDK lê essa
  env automaticamente; checamos a ausência antes pra erro descritivo).

## Alternativas consideradas
- **`fetch` nativo** (consistente com `lib/places` e `lib/pagespeed`):
  rejeitado. Teríamos que montar headers de versão, montar à mão o
  `output_config.format`, e reimplementar o tratamento de `stop_reason`
  (incl. `refusal`) e retries de 429/5xx que o SDK já dá de graça. Para uma
  única chamada complexa, o SDK paga o custo da dependência.
- **Outro provedor de LLM**: fora de questão — o domínio do produto e a
  stack fixa especificam Claude API.

## Consequências

### Positivas
- Erros tipados (`Anthropic.RateLimitError`, etc.) e retries automáticos
  de 429/5xx.
- Structured output confiável (`{ mensagem }`) sem heurística de parsing.
- Migração de modelo é troca de string (ver `specs/03-contracts/claude-messages.md`).

### Negativas / a aceitar
- Uma dependência a mais (`@anthropic-ai/sdk`) e um terceiro padrão de
  integração (SDK, enquanto Places/PageSpeed usam `fetch`). Aceito: a
  superfície da Claude API justifica o SDK; as outras duas seguem em `fetch`.
- Custo de tokens (marginal — ver contrato; ~R$0,05/Abordagem, dentro do
  teto de R$50/mês da visão).
