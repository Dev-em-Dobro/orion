import { afterEach, describe, expect, it } from "vitest";
import {
  assertCriticalSecrets,
  checkByokMasterKey,
  checkBetterAuthSecret,
  checkBetterAuthUrl,
  checkDatabaseUrl,
} from "@/lib/seguranca/env-servidor";

const KEYS = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",
  "BYOK_MASTER_KEY",
] as const;

describe("env-servidor (secrets críticos)", () => {
  const snapshot: Partial<Record<(typeof KEYS)[number], string | undefined>> =
    {};

  afterEach(() => {
    for (const k of KEYS) {
      const v = snapshot[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  function remember() {
    for (const k of KEYS) snapshot[k] = process.env[k];
  }

  it("detecta ausências", () => {
    remember();
    for (const k of KEYS) delete process.env[k];
    expect(checkDatabaseUrl().ok).toBe(false);
    expect(checkBetterAuthSecret().ok).toBe(false);
    expect(checkBetterAuthUrl().ok).toBe(false);
    expect(checkByokMasterKey().ok).toBe(false);
  });

  it("BYOK precisa decodificar 32 bytes", () => {
    remember();
    process.env.BYOK_MASTER_KEY = Buffer.alloc(8).toString("base64");
    expect(checkByokMasterKey().ok).toBe(false);
    process.env.BYOK_MASTER_KEY = Buffer.alloc(32, 1).toString("base64");
    expect(checkByokMasterKey().ok).toBe(true);
  });

  it("assertCriticalSecrets passa com tudo válido", () => {
    remember();
    process.env.DATABASE_URL = "postgresql://u:p@localhost/db";
    process.env.BETTER_AUTH_SECRET = "x".repeat(32);
    process.env.BETTER_AUTH_URL = "https://app.example.com";
    process.env.BYOK_MASTER_KEY = Buffer.alloc(32, 2).toString("base64");
    expect(() => assertCriticalSecrets()).not.toThrow();
  });

  it("assertCriticalSecrets falha se faltar secret", () => {
    remember();
    for (const k of KEYS) delete process.env[k];
    expect(() => assertCriticalSecrets()).toThrow(/Secrets críticos/);
  });
});
