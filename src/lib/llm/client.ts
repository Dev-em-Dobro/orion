// Fachada LlmClient — features usam só isto (F017 / ADR-011).

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

function mensagemAmigavel(provider: LlmProviderId, raw: string, status: number): string {
  const lower = raw.toLowerCase();
  const isQuota =
    status === 429 ||
    lower.includes("quota") ||
    lower.includes("rate limit") ||
    lower.includes("resource_exhausted") ||
    lower.includes("resource exhausted");

  if (isQuota && provider === "gemini") {
    return (
      "Gemini: cota/rate limit do free tier esgotada (ou cota = 0 no projeto). " +
      "No Google AI Studio, confira Usage / Rate limits; muitas contas novas precisam " +
      "ativar billing no projeto (mesmo para continuar no free) ou trocar de modelo/projeto. " +
      "Detalhe: " +
      raw.slice(0, 220)
    );
  }
  if (isQuota) {
    return `${LABEL_LLM_PROVIDER[provider]}: cota ou rate limit excedido. ${raw.slice(0, 280)}`;
  }
  return `${LABEL_LLM_PROVIDER[provider]}: ${raw.slice(0, 400)}`;
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

  return {
    provider,

    async generateText(opts) {
      try {
        const model = languageModel(provider, apiKey, opts.tier ?? "fast");
        if (opts.messages?.length) {
          const { text } = await generateText({
            model,
            system: opts.system,
            messages: opts.messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            maxOutputTokens: opts.maxTokens ?? 1024,
            maxRetries: maxRetriesPara(provider),
          });
          const out = text.trim();
          if (!out) {
            throw new LlmError(
              200,
              `${LABEL_LLM_PROVIDER[provider]} não retornou texto`,
              provider,
            );
          }
          return out;
        }

        if (!opts.prompt) {
          throw new LlmError(0, "prompt ou messages é obrigatório", provider);
        }

        const { text } = await generateText({
          model,
          system: opts.system,
          prompt: opts.prompt,
          maxOutputTokens: opts.maxTokens ?? 1024,
          maxRetries: maxRetriesPara(provider),
        });
        const out = text.trim();
        if (!out) {
          throw new LlmError(
            200,
            `${LABEL_LLM_PROVIDER[provider]} não retornou texto`,
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
        const { output } = await generateText({
          model,
          system: opts.system,
          prompt: opts.prompt,
          maxOutputTokens: opts.maxTokens ?? 2048,
          maxRetries: maxRetriesPara(provider),
          output: Output.object({ schema: opts.schema }),
        });
        if (output == null) {
          throw new LlmError(
            200,
            `${LABEL_LLM_PROVIDER[provider]} não retornou objeto válido`,
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

        const { output } = await generateText({
          model,
          system: opts.system,
          messages: [
            {
              role: "user",
              content: [...imageParts, { type: "text", text: opts.prompt }],
            },
          ],
          maxOutputTokens: opts.maxTokens ?? 2048,
          maxRetries: maxRetriesPara(provider),
          output: Output.object({ schema: opts.schema }),
        });
        if (output == null) {
          throw new LlmError(
            200,
            `${LABEL_LLM_PROVIDER[provider]} não retornou análise válida`,
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
