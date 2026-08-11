// F029 — o loop de ferramentas do Agente Orion.
// Spec: /specs/02-features/F029-agente-orion.md · ADR-014
//
// Usa o Vercel AI SDK, que já é dependência desde a F017 — nenhuma lib nova.
// Não passa pelo `LlmClient` porque a fachada não expõe tools; mas reusa a
// mesma resolução de provider/chave, então BYOK e modo Orion valem igual.

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { stepCountIs, streamText, type LanguageModel } from "ai";
import { obterModoChave } from "@/lib/chaves/modo";
import { exigirChave } from "@/lib/chaves";
import { exigirChaveOrion } from "@/lib/chaves/orion";
import { obterProviderLlm } from "@/lib/llm/for-user";
import { modeloPara } from "@/lib/llm/modelos";
import { tipoChaveDoProvider, type LlmProviderId } from "@/lib/llm/tipos";
import { ferramentasDoAgente, MAX_PASSOS } from "./ferramentas";
import { SYSTEM_AGENTE } from "./prompt";

export type MensagemAgente = { role: "user" | "assistant"; content: string };

function modelo(provider: LlmProviderId, apiKey: string): LanguageModel {
  const id = modeloPara(provider, "strong");
  if (provider === "anthropic") return createAnthropic({ apiKey })(id);
  if (provider === "openai") return createOpenAI({ apiKey })(id);
  return createGoogle({ apiKey })(id);
}

/**
 * Mesma regra do resto do app (F018): modo Orion usa a chave compartilhada —
 * que só existe para OpenAI —, BYOK usa o provider escolhido pelo aluno.
 */
async function resolverModelo(userId: string): Promise<LanguageModel> {
  if ((await obterModoChave(userId)) === "orion") {
    return modelo("openai", exigirChaveOrion("openai"));
  }
  const provider = await obterProviderLlm(userId);
  return modelo(provider, await exigirChave(userId, tipoChaveDoProvider(provider)));
}

/**
 * Responde em streaming. O `userId` vem da sessão e é injetado nas ferramentas
 * — não há parâmetro por onde o modelo pedir dado de outro aluno (ADR-014).
 */
export async function responderAgente(opts: {
  userId: string;
  mensagens: MensagemAgente[];
}) {
  const model = await resolverModelo(opts.userId);

  return streamText({
    model,
    system: SYSTEM_AGENTE,
    messages: opts.mensagens,
    tools: ferramentasDoAgente(opts.userId),
    // Teto duro do loop: sem isso uma pergunta ampla vira dezenas de chamadas
    // e custo imprevisível.
    stopWhen: stepCountIs(MAX_PASSOS),
    maxOutputTokens: 2048,
    maxRetries: 1,
  });
}
