import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { cifrar, decifrar, CifraError } from "@/lib/seguranca/cifra";

const KEY_32 = Buffer.alloc(32, 7).toString("base64");

describe("cifra BYOK (AES-256-GCM)", () => {
  const prev = process.env.BYOK_MASTER_KEY;

  beforeEach(() => {
    process.env.BYOK_MASTER_KEY = KEY_32;
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.BYOK_MASTER_KEY;
    else process.env.BYOK_MASTER_KEY = prev;
  });

  it("round-trip preserva o plaintext", () => {
    const secret = "sk-test-chave-aluno-123";
    const env = cifrar(secret);
    expect(env.iv).toHaveLength(12);
    expect(env.keyVersion).toBe(1);
    expect(decifrar(env)).toBe(secret);
  });

  it("cada cifrar usa IV diferente", () => {
    const a = cifrar("mesma");
    const b = cifrar("mesma");
    expect(a.iv.equals(b.iv)).toBe(false);
    expect(a.ciphertext.equals(b.ciphertext)).toBe(false);
  });

  it("falha sem BYOK_MASTER_KEY", () => {
    delete process.env.BYOK_MASTER_KEY;
    expect(() => cifrar("x")).toThrow(CifraError);
  });

  it("falha se a chave não tem 32 bytes", () => {
    process.env.BYOK_MASTER_KEY = Buffer.alloc(16).toString("base64");
    expect(() => cifrar("x")).toThrow(/32 bytes/);
  });

  it("falha se o authTag foi adulterado", () => {
    const env = cifrar("segredo");
    const bad = {
      ...env,
      authTag: Buffer.alloc(16, 0),
    };
    expect(() => decifrar(bad)).toThrow();
  });
});
