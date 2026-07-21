import { describe, expect, it } from "vitest";
import { servicosRecomendados } from "@/lib/proposta/servicos";
import { precificar } from "@/lib/proposta/precos";

describe("servicosRecomendados", () => {
  it("sem site → só CRIACAO_SITE", () => {
    expect(
      servicosRecomendados({
        tem_site: false,
        site_e_agregador: false,
        tem_https: null,
        performance_mobile: null,
      }),
    ).toEqual(["CRIACAO_SITE"]);
  });

  it("agregador → só CRIACAO_SITE", () => {
    expect(
      servicosRecomendados({
        tem_site: true,
        site_e_agregador: true,
        tem_https: true,
        performance_mobile: 40,
      }),
    ).toEqual(["CRIACAO_SITE"]);
  });

  it("site lento sem HTTPS → performance + SSL", () => {
    expect(
      servicosRecomendados({
        tem_site: true,
        site_e_agregador: false,
        tem_https: false,
        performance_mobile: 40,
      }),
    ).toEqual(["OTIMIZACAO_PERFORMANCE", "SSL_SEGURANCA"]);
  });

  it("site ok → PRESENCA_BASE", () => {
    expect(
      servicosRecomendados({
        tem_site: true,
        site_e_agregador: false,
        tem_https: true,
        performance_mobile: 90,
      }),
    ).toEqual(["PRESENCA_BASE"]);
  });
});

describe("precificar", () => {
  it("arredonda faixa para múltiplos de R$50", () => {
    const p = precificar({
      servicos: ["CRIACAO_SITE"],
      categoria: "restaurant", // MEDIO → mult 1.0
      num_avaliacoes: 50, // porte 1.0
    });
    expect(p.faixa_min % 50).toBe(0);
    expect(p.faixa_max % 50).toBe(0);
    expect(p.faixa_min).toBe(1500);
    expect(p.faixa_max).toBe(3000);
    expect(p.moeda).toBe("BRL");
  });

  it("corrige float 1500×1.15 → R$ 1.750 (não R$ 1.700)", () => {
    // Regressão §9 lançamento: 1500*1.15 pode ser 1724.999… em IEEE-754.
    const p = precificar({
      servicos: ["CRIACAO_SITE"],
      categoria: "restaurant", // MEDIO 1.0
      num_avaliacoes: 100, // porte 1.15 → mult 1.15
    });
    expect(p.faixa_min).toBe(1750);
    expect(p.faixa_max).toBe(3450); // 3000*1.15 = 3450
  });

  it("aplica multiplicador de nicho ALTO", () => {
    const p = precificar({
      servicos: ["CRIACAO_SITE"],
      categoria: "dentist", // ALTO 1.4
      num_avaliacoes: 10, // porte 0.9 → mult 1.26
    });
    // 1500*1.26 = 1890 → 1900; 3000*1.26 = 3780 → 3800
    expect(p.tier).toBe("ALTO");
    expect(p.faixa_min).toBe(1900);
    expect(p.faixa_max).toBe(3800);
  });
});
