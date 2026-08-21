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

  // F004 (emenda 2026-08-14) — AC7/AC8/AC9. O PSI desiste justamente nos piores
  // sites, e a Dor sumia junto: a Agência COW levava 6s pra abrir e saía do
  // Diagnóstico com ZERO Dores.
  describe("SITE_LENTO por tempo medido (PSI sem resposta)", () => {
    const base = {
      tem_site: true,
      site_e_agregador: false,
      tem_https: true,
      performance_mobile: null,
    };

    it("AC7 — ALTA a partir de 5s", () => {
      const dores = detectarDores(
        { ...base, tempo_carregamento_ms: 6079 },
        siteProprio,
      );
      expect(dores).toEqual([
        {
          tipo: "SITE_LENTO",
          severidade: "ALTA",
          detalhes:
            "site levou 6,1s pra carregar (o PageSpeed nem conseguiu medir)",
        },
      ]);
    });

    it("AC7 — MEDIA entre 3s e 5s", () => {
      const dores = detectarDores(
        { ...base, tempo_carregamento_ms: 3849 },
        siteProprio,
      );
      expect(dores[0]).toMatchObject({
        tipo: "SITE_LENTO",
        severidade: "MEDIA",
      });
    });

    it("AC9 — abaixo de 3s não vira Dor", () => {
      const dores = detectarDores(
        { ...base, tempo_carregamento_ms: 2999 },
        siteProprio,
      );
      expect(dores).toEqual([]);
    });

    it("AC9 — sem tempo medido não vira Dor (ignorância não é lentidão)", () => {
      expect(
        detectarDores({ ...base, tempo_carregamento_ms: null }, siteProprio),
      ).toEqual([]);
      expect(detectarDores(base, siteProprio)).toEqual([]);
    });

    it("AC8 — com nota do PSI, o tempo não gera uma segunda Dor", () => {
      const dores = detectarDores(
        {
          ...base,
          performance_mobile: 20,
          tempo_carregamento_ms: 9000,
        },
        siteProprio,
      );
      expect(dores.filter((d) => d.tipo === "SITE_LENTO")).toHaveLength(1);
      expect(dores[0]?.detalhes).toContain("nota 20/100");
    });

    it("AC8 — PSI aprovando o site ganha do tempo alto do nosso servidor", () => {
      const dores = detectarDores(
        {
          ...base,
          performance_mobile: 85,
          tempo_carregamento_ms: 9000,
        },
        siteProprio,
      );
      expect(dores).toEqual([]);
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
