import { describe, expect, it, vi } from "vitest";
import { z } from "zod";

const generateText = vi.fn();

vi.mock("ai", () => ({
  generateText: (...args: unknown[]) => generateText(...args),
  Output: { object: (opts: unknown) => opts },
}));

vi.mock("@ai-sdk/anthropic", () => ({
  createAnthropic: () => () => ({ modelId: "anthropic-model" }),
}));
vi.mock("@ai-sdk/openai", () => ({
  createOpenAI: () => () => ({ modelId: "openai-model" }),
}));
vi.mock("@ai-sdk/google", () => ({
  createGoogle: () => () => ({ modelId: "google-model" }),
}));

import { createLlmClient } from "@/lib/llm/client";
import { LlmError } from "@/lib/llm/erros";

describe("createLlmClient", () => {
  it("recusa apiKey vazia", () => {
    expect(() => createLlmClient("openai", "  ")).toThrow(LlmError);
  });

  it("generateText com prompt", async () => {
    generateText.mockResolvedValueOnce({ text: "  olá  " });
    const c = createLlmClient("openai", "sk-test");
    expect(await c.generateText({ prompt: "oi" })).toBe("olá");
  });

  it("generateText com messages e erro de quota (gemini)", async () => {
    generateText.mockRejectedValueOnce(
      Object.assign(new Error("RESOURCE_EXHAUSTED quota"), { statusCode: 429 }),
    );
    const c = createLlmClient("gemini", "gk");
    await expect(
      c.generateText({ messages: [{ role: "user", content: "x" }] }),
    ).rejects.toMatchObject({
      name: "LlmError",
      message: expect.stringMatching(/cota|Gemini/i),
    });
  });

  it("generateStructured e vision", async () => {
    const schema = z.object({ ok: z.boolean() });
    generateText.mockResolvedValueOnce({ output: { ok: true } });
    const c = createLlmClient("anthropic", "sk");
    expect(await c.generateStructured({ prompt: "p", schema })).toEqual({
      ok: true,
    });

    generateText.mockResolvedValueOnce({ output: { ok: true } });
    expect(
      await c.generateVisionStructured({
        prompt: "veja",
        schema,
        images: [
          { mediaType: "image/jpeg", dataBase64: Buffer.from("x").toString("base64") },
        ],
      }),
    ).toEqual({ ok: true });
  });
});
