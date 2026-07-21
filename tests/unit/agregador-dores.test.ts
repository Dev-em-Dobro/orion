import { describe, expect, it } from "vitest";
import { classificarWebsite } from "@/lib/diagnostico/agregador";
import { derivarDoDiagnostico } from "@/lib/dores/derivarDoDiagnostico";

describe("classificarWebsite", () => {
  it("site próprio → não agregador", () => {
    expect(classificarWebsite("https://clinicax.com.br")).toEqual({
      ehAgregador: false,
    });
  });

  it("linktree e subdomínio taplink", () => {
    expect(classificarWebsite("https://linktr.ee/fulano")).toMatchObject({
      ehAgregador: true,
      tipo: "agregador",
      plataforma: "linktr.ee",
    });
    expect(classificarWebsite("https://fulano.taplink.cc")).toMatchObject({
      ehAgregador: true,
      plataforma: "taplink.cc",
    });
  });

  it("instagram / facebook como social", () => {
    expect(classificarWebsite("instagram.com/loja")).toMatchObject({
      ehAgregador: true,
      tipo: "social",
      plataforma: "instagram.com",
      temHttps: true,
    });
    expect(classificarWebsite("https://www.facebook.com/x")).toMatchObject({
      tipo: "social",
      plataforma: "facebook.com",
    });
  });

  it("vazio ou URL inválida → false", () => {
    expect(classificarWebsite("")).toEqual({ ehAgregador: false });
    expect(classificarWebsite(":::")).toEqual({ ehAgregador: false });
  });
});

/** Compat: wrapper deprecated = detectarDores + textosDasDores (F004). */
describe("derivarDoDiagnostico (compat)", () => {
  it("sem website/site", () => {
    expect(
      derivarDoDiagnostico(
        {
          tem_site: false,
          site_e_agregador: false,
          tem_https: null,
          performance_mobile: null,
        },
        null,
      ),
    ).toEqual(["não tem site / presença digital própria"]);
  });

  it("agregador", () => {
    expect(
      derivarDoDiagnostico(
        {
          tem_site: true,
          site_e_agregador: true,
          tem_https: true,
          performance_mobile: 10,
        },
        "https://linktr.ee/x",
      ),
    ).toEqual(["só tem link-in-bio / rede social, sem site próprio"]);
  });

  it("dores técnicas", () => {
    const dores = derivarDoDiagnostico(
      {
        tem_site: true,
        site_e_agregador: false,
        tem_https: false,
        performance_mobile: 22,
      },
      "https://x.com",
    );
    expect(dores).toHaveLength(2);
    expect(dores[0]).toMatch(/lento no celular/);
    expect(dores[1]).toMatch(/sem HTTPS/);
  });

  it("site ok → sem dores derivadas", () => {
    expect(
      derivarDoDiagnostico(
        {
          tem_site: true,
          site_e_agregador: false,
          tem_https: true,
          performance_mobile: 90,
        },
        "https://x.com",
      ),
    ).toEqual([]);
  });
});

