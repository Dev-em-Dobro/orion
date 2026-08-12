import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("chaves Orion (F018)", () => {
  const original = process.env;

  beforeEach(() => {
    process.env = { ...original };
  });

  afterEach(() => {
    process.env = original;
  });

  it("obterChaveOrion lê ORION_GOOGLE_API_KEY", async () => {
    process.env.ORION_GOOGLE_API_KEY = "orion-google-key";
    const { obterChaveOrion } = await import("@/lib/chaves/orion");
    expect(obterChaveOrion("google")).toBe("orion-google-key");
  });

  it("exigirChaveOrion lança quando env ausente", async () => {
    delete process.env.ORION_OPENAI_API_KEY;
    const { exigirChaveOrion, ChaveOrionIndisponivelError } = await import(
      "@/lib/chaves/orion"
    );
    expect(() => exigirChaveOrion("openai")).toThrow(ChaveOrionIndisponivelError);
  });
});
