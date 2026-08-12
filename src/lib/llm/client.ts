// Fachada LlmClient — features usam só isto (F017 / ADR-011).
// Gemini 2.5/3.x: thinking consome maxOutputTokens → resposta vazia
// ("No output generated") se o budget for baixo. Desligamos thinking
// em tasks estruturadas e ampliamos o teto de tokens.

import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogle } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { generateText, Output, type LanguageModel } from "ai";
import type { z } from "zod";
import { LlmError } from "./erros";
import { modeloPara } from "./modelos";
import type {
  LlmChatMessage,
  LlmImage,
  LlmProviderId,
  LlmTier,
} from "./tipos";
import { LABEL_LLM_PROVIDER } from "./tipos";

export type LlmClient = {
  readonly provider: LlmProviderId;
  generateText(opts: {
    system?: string;
    prompt?: string;
    messages?: LlmChatMessage[];
    tier?: LlmTier;
    maxTokens?: number;
  }): Promise<string>;
  generateStructured<T>(opts: {
    system?: string;
    prompt: string;
    schema: z.ZodType<T>;
    tier?: LlmTier;
    maxTokens?: number;
  }): Promise<T>;
  generateVisionStructured<T>(opts: {
    system?: string;
    prompt: string;
    images: LlmImage[];
    schema: z.ZodType<T>;
    tier?: LlmTier;
    maxTokens?: number;
  }): Promise<T>;
};

function languageModel(
  provider: LlmProviderId,
  apiKey: string,
  tier: LlmTier,
): LanguageModel {
  const id = modeloPara(provider, tier);
  if (provider === "anthropic") {
    return createAnthropic({ apiKey })(id);
  }
  if (provider === "openai") {
    return createOpenAI({ apiKey })(id);
  }
  return createGoogle({ apiKey })(id);
}

/** Opções Google: sem thinking (Outreach/prosa estruturada não precisa). */
function opcoesGoogle() {
  return {
    google: {
      thinkingConfig: {
        thinkingBudget: 0,
      },
    },
  } as const;
}

function providerOptionsPara(provider: LlmProviderId) {
  return provider === "gemini" ? opcoesGoogle() : undefined;
}

/** Gemini thinking + structured pedem teto maior que o default das features. */
export function maxTokensEfetivo(
  provider: LlmProviderId,
  requested?: number,
): number {
  const base = requested ?? 2048;
  if (provider === "gemini") return Math.max(base, 8192);
  return base;
}

export function mensagemAmigavel(
  provider: LlmProviderId,
  raw: string,
  status: number,
): string {
  const lower = raw.toLowerCase();
  const label = LABEL_LLM_PROVIDER[provider];
  const isQuota =
    status === 429 ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("resource exhausted") ||
    lower.includes("exceeded your current quota");

  const isEmptyOutput =
    lower.includes("no output generated") ||
    lower.includes("no object generated") ||
    lower.includes("não retornou");

  if (isQuota && provider === "gemini") {
    return (
      "Gemini: cota/rate limit do free tier esgotada. " +
      "Em /configuracao: ative modo BYOK, escolha Gemini, cole uma chave nova " +
      "do Google AI Studio e use Testar chave. Contas novas às vezes precisam " +
      "de billing no projeto Google Cloud. Detalhe: " +
      raw.slice(0, 180)
    );
  }
  if (isQuota) {
    return (
      `${label}: cota ou rate limit excedido. ` +
      (provider === "openai"
        ? "No modo Orion a chave é compartilhada — tente de novo mais tarde ou ative BYOK com sua chave. "
        : "") +
      raw.slice(0, 220)
    );
  }
  if (isEmptyOutput && provider === "gemini") {
    return (
      "Gemini não gerou texto útil (resposta vazia). " +
      "Confirme em /configuracao: modo BYOK + provedor Gemini + chave testada com sucesso. " +
      "Se a chave estiver ok, tente de novo — o modelo às vezes esgota tokens no raciocínio interno. " +
      `Detalhe: ${raw.slice(0, 160)}`
    );
  }
  return `${label}: ${raw.slice(0, 400)}`;
}

function wrapErro(provider: LlmProviderId, e: unknown): never {
  if (e instanceof LlmError) throw e;
  const msg = e instanceof Error ? e.message : "Erro desconhecido do LLM";
  const status =
    typeof e === "object" &&
    e !== null &&
    "statusCode" in e &&
    typeof (e as { statusCode: unknown }).statusCode === "number"
      ? (e as { statusCode: number }).statusCode
      : 0;
  throw new LlmError(status, mensagemAmigavel(provider, msg, status), provider);
}

/** Retries extras em 429 só queimam cota — Gemini free tier é apertado. */
function maxRetriesPara(provider: LlmProviderId): number {
  return provider === "gemini" ? 0 : 2;
}

export function createLlmClient(
  provider: LlmProviderId,
  apiKey: string,
): LlmClient {
  if (!apiKey.trim()) {
    throw new LlmError(
      0,
      `${LABEL_LLM_PROVIDER[provider]} não configurada — configure em /configuracao`,
      provider,
    );
  }

  const common = (maxTokens?: number) => ({
    maxOutputTokens: maxTokensEfetivo(provider, maxTokens),
    maxRetries: maxRetriesPara(provider),
    providerOptions: providerOptionsPara(provider),
  });

  return {
    provider,

    async generateText(opts) {
      try {
        const model = languageModel(provider, apiKey, opts.tier ?? "fast");
        if (opts.messages?.length) {
          const { text, finishReason } = await generateText({
            model,
            system: opts.system,
            messages: opts.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            ...common(opts.maxTokens ?? 1024),
          });
          const out = text.trim();
          if (!out) {
            throw new LlmError(
              200,
              `${LABEL_LLM_PROVIDER[provider]} não retornou texto (finishReason=${finishReason})`,
              provider,
            );
          }
          return out;
        }

        if (!opts.prompt) {
          throw new LlmError(0, "prompt ou messages é obrigatório", provider);
        }

        const { text, finishReason } = await generateText({
          model,
          system: opts.system,
          prompt: opts.prompt,
          ...common(opts.maxTokens ?? 1024),
        });
        const out = text.trim();
        if (!out) {
          throw new LlmError(
            200,
            `${LABEL_LLM_PROVIDER[provider]} não retornou texto (finishReason=${finishReason})`,
            provider,
          );
        }
        return out;
      } catch (e) {
        wrapErro(provider, e);
      }
    },

    async generateStructured(opts) {
      try {
        const model = languageModel(provider, apiKey, opts.tier ?? "strong");
        const { output, finishReason, text } = await generateText({
          model,
          system: opts.system,
          prompt: opts.prompt,
          ...common(opts.maxTokens ?? 2048),
          output: Output.object({ schema: opts.schema }),
        });
        if (output == null) {
          throw new LlmError(
            200,
            `${LABEL_LLM_PROVIDER[provider]} não retornou objeto válido ` +
              `(finishReason=${finishReason}${text ? `; trecho="${text.slice(0, 80)}"` : ""})`,
            provider,
          );
        }
        return output;
      } catch (e) {
        wrapErro(provider, e);
      }
    },

    async generateVisionStructured(opts) {
      try {
        const model = languageModel(provider, apiKey, opts.tier ?? "fast");
        const imageParts = opts.images.map((img) => ({
          type: "image" as const,
          image: Buffer.from(img.dataBase64, "base64"),
          mediaType: img.mediaType,
        }));

        const { output, finishReason } = await generateText({
          model,
          system: opts.system,
          messages: [
            {
              role: "user",
              content: [...imageParts, { type: "text", text: opts.prompt }],
            },
          ],
          ...common(opts.maxTokens ?? 2048),
          output: Output.object({ schema: opts.schema }),
        });
        if (output == null) {
          throw new LlmError(
            200,
            `${LABEL_LLM_PROVIDER[provider]} não retornou análise válida (finishReason=${finishReason})`,
            provider,
          );
        }
        return output;
      } catch (e) {
        wrapErro(provider, e);
      }
    },
  };
}
