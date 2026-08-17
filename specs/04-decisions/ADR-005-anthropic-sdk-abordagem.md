# ADR-005 — SDK oficial da Anthropic para a Abordagem

## Status
Aceito — 2026-06-12 · **a feature que o motivou saiu em 2026-08-16; a decisão
continua valendo.**

> **Nota de 2026-08-16.** A [F005](../02-features/F005-abordagem-whatsapp.md)
> deixou de usar LLM: a Abordagem passou a ser montada em código. O título deste
> ADR ficou enganoso, então vale ser explícito sobre o que sobrevive.
>
> **A decisão NÃO é revertida.** `@anthropic-ai/sdk` continua no projeto e
> continua sendo a integração com a Claude API — o que mudou é quem a usa. A
> lib foi adotada aqui porque a Abordagem foi a **primeira** feature de LLM;
> desde então ela virou base do Agente ([F029](../02-features/F029-agente-orion.md)),
> do Simulador ([F013](../02-features/F013-simulador-de-venda.md)) e da saída de
> escape das Objeções ([F011](../02-features/F011-assistente-de-objecoes.md)),
> por baixo da camada multi-provider da
> [F017](../02-features/F017-multi-provider-llm.md)/[ADR-011](ADR-011-camada-multi-provider.md).
>
> O que **caiu** foram os detalhes específicos da Abordagem: `src/lib/abordagem/`
> não chama mais o SDK, o model id `claude-opus-4-8` citado aqui já estava
> desatualizado (ver a nota da [11 §2](../11-custos-e-precificacao.md)), e a
> consequência "~R$0,05/Abordagem" virou **$0**.
>
> Removê-lo do projeto exigiria tirar a IA do Agente e do Simulador também — o
> que o [relatório de custos](../../docs/relatorio-de-custos-2026-08-16.md) §4.3
> desaconselha, porque as duas somam R$1,25/mês e são a IA que não vira template.

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
