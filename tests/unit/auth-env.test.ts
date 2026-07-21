import { afterEach, describe, expect, it } from "vitest";
import { loadAuthEnv, requireAuthEnv } from "@/lib/auth/env";

describe("auth/env", () => {
  const keys = [
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
  ] as const;
  const snap: Partial<Record<(typeof keys)[number], string | undefined>> = {};

  afterEach(() => {
    for (const k of keys) {
      const v = snap[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  function remember() {
    for (const k of keys) snap[k] = process.env[k];
  }

  it("requireAuthEnv lança se ausente", () => {
    remember();
    delete process.env.BETTER_AUTH_SECRET;
    expect(() => requireAuthEnv("BETTER_AUTH_SECRET")).toThrow(/ausente/);
  });

  it("loadAuthEnv sem Google", () => {
    remember();
    process.env.BETTER_AUTH_SECRET = "secret-com-mais-de-16";
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    delete process.env.GOOGLE_CLIENT_ID;
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(loadAuthEnv().google).toBeNull();
  });

  it("loadAuthEnv exige ambos Google ou nenhum", () => {
    remember();
    process.env.BETTER_AUTH_SECRET = "secret-com-mais-de-16";
    process.env.BETTER_AUTH_URL = "http://localhost:3000";
    process.env.GOOGLE_CLIENT_ID = "id";
    delete process.env.GOOGLE_CLIENT_SECRET;
    expect(() => loadAuthEnv()).toThrow(/ambos/);
  });

  it("loadAuthEnv com Google completo", () => {
    remember();
    process.env.BETTER_AUTH_SECRET = "secret-com-mais-de-16";
    process.env.BETTER_AUTH_URL = "https://app.example.com";
    process.env.GOOGLE_CLIENT_ID = "id";
    process.env.GOOGLE_CLIENT_SECRET = "sec";
    expect(loadAuthEnv().google).toEqual({
      clientId: "id",
      clientSecret: "sec",
    });
  });
});
