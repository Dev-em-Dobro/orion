import type { LlmProviderId, LlmTier } from "./tipos";

/** Modelos estáveis por tier. Anthropic = referência (ADR-011). */
const MODELS = {
  anthropic: {
    strong: "claude-opus-4-8",
    fast: "claude-haiku-4-5",
  },
  openai: {
    strong: "gpt-4o",
    fast: "gpt-4o-mini",
  },
  gemini: {
    // Sucessores oficiais (2.0/2.5-lite bloqueados p/ contas novas — jul/2026).
    strong: "gemini-3.5-flash",
    fast: "gemini-3.1-flash-lite",
  },
} as const satisfies Record<LlmProviderId, Record<LlmTier, string>>;

export function modeloPara(
  provider: LlmProviderId,
  tier: LlmTier = "strong",
): string {
  return MODELS[provider][tier];
}
