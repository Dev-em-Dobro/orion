export type LlmProviderId = "anthropic" | "openai" | "gemini";

export type LlmTier = "fast" | "strong";

export type LlmChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type LlmImage = {
  mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  dataBase64: string;
};

export const LABEL_LLM_PROVIDER: Record<LlmProviderId, string> = {
  anthropic: "Anthropic",
  openai: "OpenAI",
  gemini: "Gemini",
};

/** Slot BYOK correspondente ao provider de IA. */
export function tipoChaveDoProvider(
  provider: LlmProviderId,
): "anthropic" | "openai" | "gemini" {
  return provider;
}
