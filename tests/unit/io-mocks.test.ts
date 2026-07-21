import { afterEach, describe, expect, it, vi } from "vitest";
import { PlacesError, textSearch } from "@/lib/places/textSearch";
import {
  PagespeedError,
  performanceMobile,
} from "@/lib/pagespeed/performanceMobile";
import { verificarSite } from "@/lib/diagnostico/verificarSite";
import { modeloPara } from "@/lib/llm/modelos";
import { tipoChaveDoProvider } from "@/lib/llm/tipos";
import { ChaveOperacaoError } from "@/lib/chaves/erros";

describe("textSearch", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exige apiKey", async () => {
    await expect(textSearch("dentista sp", "")).rejects.toBeInstanceOf(
      PlacesError,
    );
  });

  it("mapeia places e falha em HTTP error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          places: [
            {
              id: "p1",
              displayName: { text: "Clínica" },
              formattedAddress: "Rua 1",
              primaryType: "dentist",
              rating: 4.5,
              userRatingCount: 10,
            },
            {
              id: "p2",
              types: ["cafe"],
            },
          ],
        }),
      }),
    );

    const rows = await textSearch("dentista", "key");
    expect(rows[0]).toMatchObject({
      id: "p1",
      nome: "Clínica",
      categoria: "dentist",
      nota: 4.5,
    });
    expect(rows[1]).toMatchObject({
      nome: "(sem nome)",
      categoria: "cafe",
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: "Forbidden",
        text: async () => "denied",
      }),
    );
    await expect(textSearch("x", "key")).rejects.toMatchObject({
      status: 403,
      message: "denied",
    });
  });
});

describe("performanceMobile", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("exige apiKey e converte score 0–1 → 0–100", async () => {
    await expect(performanceMobile("https://x.com", "")).rejects.toBeInstanceOf(
      PagespeedError,
    );

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          lighthouseResult: {
            categories: { performance: { score: 0.73 } },
          },
        }),
      }),
    );
    expect(await performanceMobile("https://x.com", "key")).toBe(73);
  });

  it("falha sem score no corpo", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      }),
    );
    await expect(
      performanceMobile("https://x.com", "key"),
    ).rejects.toBeInstanceOf(PagespeedError);
  });
});

describe("verificarSite", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("200 HTTPS → temSite", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        status: 200,
        arrayBuffer: async () => new ArrayBuffer(8),
      }),
    );
    const r = await verificarSite("https://exemplo.com");
    expect(r).toMatchObject({
      temSite: true,
      temHttps: true,
      urlFinal: "https://exemplo.com",
    });
  });

  it("segue redirect e 404 → sem site", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          status: 301,
          headers: { get: () => "https://final.com/" },
          body: { cancel: async () => undefined },
        })
        .mockResolvedValueOnce({
          status: 200,
          arrayBuffer: async () => new ArrayBuffer(0),
        }),
    );
    const ok = await verificarSite("http://exemplo.com");
    expect(ok).toMatchObject({
      temSite: true,
      urlFinal: "https://final.com/",
      temHttps: true,
    });

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({ status: 404 }),
    );
    expect(await verificarSite("https://x.com")).toEqual({ temSite: false });
  });

  it("rede/abort → temSite false", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new Error("network")),
    );
    expect(await verificarSite("https://x.com")).toEqual({ temSite: false });
  });
});

describe("llm modelos/tipos + erros de chave", () => {
  it("modeloPara e tipoChaveDoProvider", () => {
    expect(modeloPara("anthropic", "fast")).toBe("claude-haiku-4-5");
    expect(modeloPara("gemini", "strong")).toBe("gemini-3.5-flash");
    expect(tipoChaveDoProvider("openai")).toBe("openai");
  });

  it("ChaveOperacaoError", () => {
    expect(new ChaveOperacaoError("ping falhou").message).toBe("ping falhou");
  });
});
