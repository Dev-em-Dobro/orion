import { describe, expect, it } from "vitest";
import { detectarDores } from "@/lib/dores/detectar";
import { textosDasDores } from "@/lib/dores/textos";

const siteProprio = "https://clinicax.com.br";

describe("detectarDores", () => {
  it("SEM_SITE — sem website", () => {
    expect(
      detectarDores(
        {
          tem_site: false,
          site_e_agregador: false,
          tem_https: null,
          performance_mobile: null,
        },
        null,
      ),
    ).toEqual([
      {
        tipo: "SEM_SITE",
        severidade: "ALTA",
        detalhes: "não tem site / presença digital própria",
      },
    ]);
  });

  it("SEM_SITE — tem_site false com URL", () => {
    const dores = detectarDores(
      {
        tem_site: false,
        site_e_agregador: false,
        tem_https: null,
        performance_mobile: null,
      },
      "https://fora-do-ar.example",
    );
    expect(dores).toHaveLength(1);
    expect(dores[0]?.tipo).toBe("SEM_SITE");
  });

  it("SITE_AGREGADOR — exclusivos (não empilha LENTO/HTTPS)", () => {
    expect(
      detectarDores(
        {
          tem_site: true,
          site_e_agregador: true,
          tem_https: true,
          performance_mobile: 10,
        },
        "https://linktr.ee/x",
      ),
    ).toEqual([
      {
        tipo: "SITE_AGREGADOR",
        severidade: "ALTA",
        detalhes: "só tem link-in-bio / rede social, sem site próprio",
      },
    ]);
  });

  it("SITE_LENTO — ALTA se performance < 30", () => {
    const dores = detectarDores(
      {
        tem_site: true,
        site_e_agregador: false,
        tem_https: true,
        performance_mobile: 22,
      },
      siteProprio,
    );
    expect(dores).toEqual([
      {
        tipo: "SITE_LENTO",
        severidade: "ALTA",
        detalhes:
          "site muito lento no celular (nota 22/100 no Google PageSpeed)",
      },
    ]);
  });

  it("SITE_LENTO — MEDIA se 30 <= performance < 50", () => {
    const dores = detectarDores(
      {
        tem_site: true,
        site_e_agregador: false,
        tem_https: true,
        performance_mobile: 40,
      },
      siteProprio,
    );
    expect(dores[0]).toMatchObject({
      tipo: "SITE_LENTO",
      severidade: "MEDIA",
    });
  });

  it("SEM_HTTPS — MEDIA", () => {
    expect(
      detectarDores(
        {
          tem_site: true,
          site_e_agregador: false,
          tem_https: false,
          performance_mobile: 90,
        },
        siteProprio,
      ),
    ).toEqual([
      {
        tipo: "SEM_HTTPS",
        severidade: "MEDIA",
        detalhes: "site sem HTTPS (sem cadeado de segurança)",
      },
    ]);
  });

  it("SITE_LENTO + SEM_HTTPS podem coexistir", () => {
    const dores = detectarDores(
      {
        tem_site: true,
        site_e_agregador: false,
        tem_https: false,
        performance_mobile: 22,
      },
      siteProprio,
    );
    expect(dores.map((d) => d.tipo)).toEqual(["SITE_LENTO", "SEM_HTTPS"]);
  });

  it("site ok → zero Dores", () => {
    expect(
      detectarDores(
        {
          tem_site: true,
          site_e_agregador: false,
          tem_https: true,
          performance_mobile: 90,
        },
        siteProprio,
      ),
    ).toEqual([]);
  });

  it("performance null → não cria SITE_LENTO", () => {
    expect(
      detectarDores(
        {
          tem_site: true,
          site_e_agregador: false,
          tem_https: true,
          performance_mobile: null,
        },
        siteProprio,
      ),
    ).toEqual([]);
  });

  it("não cria SEM_RESPOSTA_REVIEWS", () => {
    const tipos = detectarDores(
      {
        tem_site: true,
        site_e_agregador: false,
        tem_https: false,
        performance_mobile: 20,
      },
      siteProprio,
    ).map((d) => d.tipo);
    expect(tipos).not.toContain("SEM_RESPOSTA_REVIEWS");
  });
});

describe("textosDasDores", () => {
  it("extrai detalhes não vazios", () => {
    expect(
      textosDasDores([
        { detalhes: "a" },
        { detalhes: "  " },
        { detalhes: "b" },
      ]),
    ).toEqual(["a", "b"]);
  });
});
