import { afterEach, beforeEach, describe, expect, it } from "vitest";
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

// F014 (emenda 2026-08-16) — AC12. Login em Preview da Vercel morria em
// "Invalid origin", e liberar só a origem faria o magic link do staging
// apontar pra produção. As duas coisas saem da mesma função.
describe("auth/env — Preview da Vercel (AC12)", () => {
  const keys = [
    "BETTER_AUTH_SECRET",
    "BETTER_AUTH_URL",
    "GOOGLE_CLIENT_ID",
    "GOOGLE_CLIENT_SECRET",
    "VERCEL_ENV",
    "VERCEL_URL",
    "VERCEL_BRANCH_URL",
    "VERCEL_PROJECT_PRODUCTION_URL",
  ] as const;
  const snap: Partial<Record<(typeof keys)[number], string | undefined>> = {};

  const PRODUCAO = "orion-lead-hunter.devemdobro.com";

  beforeEach(() => {
    for (const k of keys) snap[k] = process.env[k];
    for (const k of keys) delete process.env[k];
    process.env.BETTER_AUTH_SECRET = "secret-com-mais-de-16";
  });

  afterEach(() => {
    for (const k of keys) {
      const v = snap[k];
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
  });

  /** O ambiente de um deploy de Preview, com a var herdada de produção. */
  function preview(extra: Record<string, string> = {}) {
    process.env.BETTER_AUTH_URL = `https://${PRODUCAO}`;
    process.env.VERCEL_ENV = "preview";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = PRODUCAO;
    process.env.VERCEL_BRANCH_URL = "prospect-engine-git-feat-x.vercel.app";
    process.env.VERCEL_URL = "prospect-engine-abc123.vercel.app";
    for (const [k, v] of Object.entries(extra)) process.env[k] = v;
  }

  it("em produção nada muda: uma origem, a configurada", () => {
    process.env.BETTER_AUTH_URL = `https://${PRODUCAO}`;
    process.env.VERCEL_ENV = "production";
    process.env.VERCEL_URL = "prospect-engine-xyz.vercel.app";

    const env = loadAuthEnv();
    expect(env.baseURL).toBe(`https://${PRODUCAO}`);
    expect(env.trustedOrigins).toEqual([`https://${PRODUCAO}`]);
  });

  it("fora da Vercel (local/CI) nada muda", () => {
    process.env.BETTER_AUTH_URL = "http://localhost:3000";

    const env = loadAuthEnv();
    expect(env.baseURL).toBe("http://localhost:3000");
    expect(env.trustedOrigins).toEqual(["http://localhost:3000"]);
  });

  it("em Preview, a URL da branch vira a baseURL — não a de produção", () => {
    preview();

    const env = loadAuthEnv();
    // É daqui que sai o magic link: apontar pra produção mandaria o aluno pro
    // banco errado.
    expect(env.baseURL).toBe("https://prospect-engine-git-feat-x.vercel.app");
    expect(env.trustedOrigins).toContain(
      "https://prospect-engine-git-feat-x.vercel.app",
    );
    expect(env.trustedOrigins).toContain(
      "https://prospect-engine-abc123.vercel.app",
    );
    expect(env.trustedOrigins).not.toContain(`https://${PRODUCAO}`);
  });

  it("prefere a URL estável da branch à do deploy", () => {
    preview();
    const env = loadAuthEnv();
    // `VERCEL_URL` muda a cada deploy: um redeploy invalidaria o magic link
    // que já saiu por e-mail.
    expect(env.baseURL).not.toBe("https://prospect-engine-abc123.vercel.app");
  });

  it("sem VERCEL_BRANCH_URL, cai na URL do deploy", () => {
    preview();
    delete process.env.VERCEL_BRANCH_URL;

    expect(loadAuthEnv().baseURL).toBe(
      "https://prospect-engine-abc123.vercel.app",
    );
  });

  it("domínio fixo de staging vence a URL da branch", () => {
    // Host diferente do de produção ⇒ foi definido **para** o Preview.
    preview({ BETTER_AUTH_URL: "https://staging-orion.devemdobro.com" });

    const env = loadAuthEnv();
    expect(env.baseURL).toBe("https://staging-orion.devemdobro.com");
    // As URLs da Vercel continuam aceitas: o mesmo deploy responde pelas três.
    expect(env.trustedOrigins).toContain(
      "https://prospect-engine-git-feat-x.vercel.app",
    );
  });

  it("não repete origem quando a staging é a própria URL da branch", () => {
    preview({ BETTER_AUTH_URL: "https://prospect-engine-git-feat-x.vercel.app" });

    const env = loadAuthEnv();
    expect(env.trustedOrigins).toEqual([
      "https://prospect-engine-git-feat-x.vercel.app",
      "https://prospect-engine-abc123.vercel.app",
    ]);
  });
});
