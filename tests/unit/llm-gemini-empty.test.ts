import { describe, expect, it } from "vitest";
import { maxTokensEfetivo, mensagemAmigavel } from "@/lib/llm/client";

describe("llm client mensagens / tokens", () => {
  it("amplia teto no Gemini", () => {
    expect(maxTokensEfetivo("gemini", 1024)).toBe(8192);
    expect(maxTokensEfetivo("openai", 1024)).toBe(1024);
  });

  it("explica No output generated no Gemini", () => {
    const msg = mensagemAmigavel("gemini", "No output generated.", 200);
    expect(msg.toLowerCase()).toContain("byok");
    expect(msg.toLowerCase()).toContain("gemini");
  });

  it("explica quota Orion/OpenAI", () => {
    const msg = mensagemAmigavel("openai", "rate limit exceeded", 429);
    expect(msg.toLowerCase()).toContain("byok");
  });
});
