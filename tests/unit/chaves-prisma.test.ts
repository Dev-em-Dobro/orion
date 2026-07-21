import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCipheriv, randomBytes } from "node:crypto";

const KEY = Buffer.alloc(32, 9);
const KEY_B64 = KEY.toString("base64");

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    userApiKeys: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      upsert: vi.fn(),
    },
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

vi.mock("@/lib/places/textSearch", () => ({
  textSearch: vi.fn().mockResolvedValue([{ id: "1", nome: "X" }]),
}));

vi.mock("@anthropic-ai/sdk", () => {
  class Anthropic {
    messages = {
      create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "ok" }] }),
    };
    constructor(_opts: { apiKey: string }) {}
  }
  return { default: Anthropic };
});

import { exigirChave, obterChave } from "@/lib/chaves/resolver";
import {
  atualizarStatusChave,
  chavesEssenciaisFaltando,
  listarVisaoChaves,
  removerChave,
  salvarChave,
} from "@/lib/chaves/repositorio";
import { testarChaveSalva } from "@/lib/chaves/testar";
import { ChaveAusenteError, ChaveOperacaoError } from "@/lib/chaves/erros";
import {
  createLlmForUser,
  obterProviderLlm,
  salvarProviderLlm,
} from "@/lib/llm/for-user";
import { ChaveAusenteError as CA } from "@/lib/chaves/erros";

function envelopeDe(plaintext: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", KEY, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  return { ciphertext, iv, authTag, keyVersion: 1 };
}

function rowGoogle(plaintext = "google-key-abcdef") {
  const e = envelopeDe(plaintext);
  return {
    user_id: "u1",
    google_ciphertext: e.ciphertext,
    google_iv: e.iv,
    google_auth_tag: e.authTag,
    google_key_version: 1,
    google_last4: "cdef",
    google_status: "configurada",
    anthropic_ciphertext: null,
    anthropic_iv: null,
    anthropic_auth_tag: null,
    anthropic_key_version: 1,
    anthropic_last4: null,
    anthropic_status: "faltando",
    openai_ciphertext: null,
    openai_iv: null,
    openai_auth_tag: null,
    openai_key_version: 1,
    openai_last4: null,
    openai_status: "faltando",
    gemini_ciphertext: null,
    gemini_iv: null,
    gemini_auth_tag: null,
    gemini_key_version: 1,
    gemini_last4: null,
    gemini_status: "faltando",
    screenshotone_ciphertext: null,
    screenshotone_iv: null,
    screenshotone_auth_tag: null,
    screenshotone_key_version: 1,
    screenshotone_last4: null,
    screenshotone_status: "faltando",
  };
}

describe("chaves resolver/repositorio/testar + for-user", () => {
  const prevKey = process.env.BYOK_MASTER_KEY;

  beforeEach(() => {
    process.env.BYOK_MASTER_KEY = KEY_B64;
    vi.clearAllMocks();
  });

  afterEach(() => {
    if (prevKey === undefined) delete process.env.BYOK_MASTER_KEY;
    else process.env.BYOK_MASTER_KEY = prevKey;
    vi.unstubAllGlobals();
  });

  it("obterChave / exigirChave", async () => {
    prismaMock.userApiKeys.findUnique.mockResolvedValue(null);
    expect(await obterChave("u1", "google")).toBeNull();
    await expect(exigirChave("u1", "google")).rejects.toBeInstanceOf(
      ChaveAusenteError,
    );

    prismaMock.userApiKeys.findUnique.mockResolvedValue(rowGoogle());
    expect(await obterChave("u1", "google")).toBe("google-key-abcdef");
    expect(await exigirChave("u1", "google")).toBe("google-key-abcdef");
  });

  it("listarVisaoChaves e essenciais faltando", async () => {
    prismaMock.userApiKeys.findUnique.mockResolvedValue(null);
    prismaMock.$queryRaw.mockResolvedValue([]);
    const vazia = await listarVisaoChaves("u1");
    expect(vazia).toHaveLength(5);
    expect(vazia.every((v) => v.status === "faltando")).toBe(true);

    const faltando = await chavesEssenciaisFaltando("u1");
    expect(faltando).toEqual(["google", "anthropic"]);

    prismaMock.userApiKeys.findUnique.mockResolvedValue(rowGoogle());
    prismaMock.$queryRaw.mockResolvedValue([{ llm_provider: "openai" }]);
    const f2 = await chavesEssenciaisFaltando("u1");
    expect(f2).toContain("openai");
    expect(f2).not.toContain("google");
  });

  it("salvarChave / removerChave / atualizarStatus", async () => {
    prismaMock.userApiKeys.findUnique.mockResolvedValue(null);
    prismaMock.userApiKeys.create.mockResolvedValue(rowGoogle());
    const savedRow = {
      ...rowGoogle("sk-ant-1234567890"),
      anthropic_ciphertext: envelopeDe("sk-ant-1234567890").ciphertext,
      anthropic_iv: envelopeDe("sk-ant-1234567890").iv,
      anthropic_auth_tag: envelopeDe("sk-ant-1234567890").authTag,
      anthropic_last4: "7890",
      anthropic_status: "configurada",
    };
    // salvarChave call cifrar once â€” mock update with consistent last4
    prismaMock.userApiKeys.update.mockImplementation(async ({ data }) => ({
      ...rowGoogle(),
      ...data,
      anthropic_status: data.anthropic_status ?? "configurada",
      anthropic_last4: data.anthropic_last4 ?? "7890",
    }));

    await expect(salvarChave("u1", "anthropic", "curta")).rejects.toBeInstanceOf(
      ChaveOperacaoError,
    );

    const visao = await salvarChave("u1", "anthropic", "sk-ant-1234567890");
    expect(visao.status).toBe("configurada");
    expect(visao.mascara).toMatch(/^.{4}7890$/);

    prismaMock.userApiKeys.findUnique.mockResolvedValue(null);
    const sem = await removerChave("u1", "anthropic");
    expect(sem.status).toBe("faltando");

    prismaMock.userApiKeys.findUnique.mockResolvedValue(savedRow);
    prismaMock.userApiKeys.update.mockResolvedValue({
      ...savedRow,
      anthropic_status: "faltando",
      anthropic_last4: null,
    });
    const rem = await removerChave("u1", "anthropic");
    expect(rem.status).toBe("faltando");

    prismaMock.userApiKeys.findUnique.mockResolvedValue(null);
    await expect(
      atualizarStatusChave("u1", "google", "invalida"),
    ).rejects.toBeInstanceOf(ChaveOperacaoError);

    prismaMock.userApiKeys.findUnique.mockResolvedValue(rowGoogle());
    await atualizarStatusChave("u1", "google", "configurada");
    expect(prismaMock.userApiKeys.update).toHaveBeenCalled();
  });

  it("testarChaveSalva openai/gemini/screenshotone com fetch", async () => {
    const plain = "sk-openai-test-key-99";
    const e = envelopeDe(plain);
    const row = {
      ...rowGoogle(),
      openai_ciphertext: e.ciphertext,
      openai_iv: e.iv,
      openai_auth_tag: e.authTag,
      openai_last4: "y-99",
      openai_status: "configurada",
    };
    prismaMock.userApiKeys.findUnique.mockResolvedValue(row);
    prismaMock.userApiKeys.update.mockResolvedValue(row);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) }),
    );
    expect((await testarChaveSalva("u1", "openai")).ok).toBe(true);

    const eg = envelopeDe("gemini-key-xxxxxxxxxx");
    prismaMock.userApiKeys.findUnique.mockResolvedValue({
      ...rowGoogle(),
      gemini_ciphertext: eg.ciphertext,
      gemini_iv: eg.iv,
      gemini_auth_tag: eg.authTag,
      gemini_last4: "xxxx",
      gemini_status: "configurada",
    });
    expect((await testarChaveSalva("u1", "gemini")).ok).toBe(true);

    const es = envelopeDe("screenshotone-key-xx");
    prismaMock.userApiKeys.findUnique.mockResolvedValue({
      ...rowGoogle(),
      screenshotone_ciphertext: es.ciphertext,
      screenshotone_iv: es.iv,
      screenshotone_auth_tag: es.authTag,
      screenshotone_last4: "y-xx",
      screenshotone_status: "configurada",
    });
    expect((await testarChaveSalva("u1", "screenshotone")).ok).toBe(true);

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 401 }),
    );
    const fail = await testarChaveSalva("u1", "screenshotone");
    expect(fail.ok).toBe(false);
  });

  it("obterProviderLlm / salvarProviderLlm / createLlmForUser", async () => {
    prismaMock.$queryRaw.mockResolvedValue([{ llm_provider: "gemini" }]);
    expect(await obterProviderLlm("u1")).toBe("gemini");

    prismaMock.$queryRaw.mockResolvedValue([]);
    expect(await obterProviderLlm("u1")).toBe("anthropic");

    prismaMock.userApiKeys.upsert.mockResolvedValue({});
    prismaMock.$executeRaw.mockResolvedValue(1);
    expect(await salvarProviderLlm("u1", "openai")).toBe("openai");

    prismaMock.$queryRaw.mockResolvedValue([{ llm_provider: "anthropic" }]);
    prismaMock.userApiKeys.findUnique.mockResolvedValue(null);
    await expect(createLlmForUser("u1")).rejects.toBeInstanceOf(CA);

    const plain = "sk-ant-chave-valida-1";
    const e = envelopeDe(plain);
    prismaMock.userApiKeys.findUnique.mockResolvedValue({
      ...rowGoogle(),
      anthropic_ciphertext: e.ciphertext,
      anthropic_iv: e.iv,
      anthropic_auth_tag: e.authTag,
      anthropic_last4: "da-1",
      anthropic_status: "configurada",
    });
    const client = await createLlmForUser("u1");
    expect(client.provider).toBe("anthropic");
  });
});
