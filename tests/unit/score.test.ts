import { describe, expect, it } from "vitest";
import { calcularScore, necessidade, valor } from "@/lib/score/score";
import { tierDoNicho } from "@/lib/score/nichos";

describe("tierDoNicho", () => {
  it("classifica ALTO / MEDIO / BAIXO", () => {
    expect(tierDoNicho("dentist")).toBe("ALTO");
    expect(tierDoNicho("restaurant")).toBe("MEDIO");
    expect(tierDoNicho("unknown_place_type")).toBe("BAIXO");
  });

  it("é case-insensitive", () => {
    expect(tierDoNicho("Dentist")).toBe("ALTO");
  });
});

describe("valor", () => {
  it("pesos 0.6 tier + 0.4 porte (nicho ALTO, porte médio)", () => {
    // ALTO=100, 21–80 avaliacoes → porte 50 → 0.6*100+0.4*50 = 80
    const r = valor({ categoria: "dentist", num_avaliacoes: 50 });
    expect(r.tier).toBe("ALTO");
    expect(r.valor).toBe(80);
  });

  it("porte null ou baixo → score de porte 20", () => {
    const r = valor({ categoria: "cafe", num_avaliacoes: null });
    // MEDIO=55 → 0.6*55+0.4*20 = 33+8 = 41
    expect(r.tier).toBe("MEDIO");
    expect(r.valor).toBe(41);
  });
  it("porte alto (≥301) → 100", () => {
    const r = valor({ categoria: "dentist", num_avaliacoes: 400 });
    // 0.6*100 + 0.4*100 = 100
    expect(r.valor).toBe(100);
  });

  it("porte 81–300 → 80", () => {
    const r = valor({ categoria: "unknown", num_avaliacoes: 100 });
    // BAIXO=20 → 0.6*20 + 0.4*80 = 12+32 = 44
    expect(r.valor).toBe(44);
  });
});

describe("necessidade", () => {
  it("sem site → 100", () => {
    expect(
      necessidade({
        tem_site: false,
        site_e_agregador: false,
        tem_https: null,
        performance_mobile: null,
      }),
    ).toBe(100);
  });

  it("só agregador → 100 (F009)", () => {
    expect(
      necessidade({
        tem_site: true,
        site_e_agregador: true,
        tem_https: true,
        performance_mobile: 90,
      }),
    ).toBe(100);
  });

  it("site lento sem HTTPS sobe a necessidade", () => {
    // base 20 + perf<50 (+50) + sem https (+20) = 90
    expect(
      necessidade({
        tem_site: true,
        site_e_agregador: false,
        tem_https: false,
        performance_mobile: 30,
      }),
    ).toBe(90);
  });

  it("site bom com HTTPS → necessidade baixa (20)", () => {
    expect(
      necessidade({
        tem_site: true,
        site_e_agregador: false,
        tem_https: true,
        performance_mobile: 90,
      }),
    ).toBe(20);
  });
  it("perf null adiciona +25; perf média +25", () => {
    expect(
      necessidade({
        tem_site: true,
        site_e_agregador: false,
        tem_https: true,
        performance_mobile: null,
      }),
    ).toBe(45);
    expect(
      necessidade({
        tem_site: true,
        site_e_agregador: false,
        tem_https: true,
        performance_mobile: 60,
      }),
    ).toBe(45);
  });

  // F003 (emenda 2026-08-14) — o `null` do PSI achatava em +25 tanto o site que
  // não deu pra medir quanto o que levava 6s pra abrir.
  describe("perf null desempatado pelo tempo medido", () => {
    const base = {
      tem_site: true,
      site_e_agregador: false,
      tem_https: true,
      performance_mobile: null,
    };

    it("carregamento >= 5s pesa como perf < 50 (+50)", () => {
      expect(necessidade({ ...base, tempo_carregamento_ms: 6079 })).toBe(70);
    });

    it("carregamento entre 3s e 5s pesa +35", () => {
      expect(necessidade({ ...base, tempo_carregamento_ms: 3849 })).toBe(55);
    });

    it("abaixo de 3s ou sem medição continua +25", () => {
      expect(necessidade({ ...base, tempo_carregamento_ms: 800 })).toBe(45);
      expect(necessidade({ ...base, tempo_carregamento_ms: null })).toBe(45);
      expect(necessidade(base)).toBe(45);
    });

    it("soma com a falta de HTTPS, e o teto continua 100", () => {
      expect(
        necessidade({
          ...base,
          tem_https: false,
          tempo_carregamento_ms: 6079,
        }),
      ).toBe(90);
    });
  });
});

describe("calcularScore", () => {
  it("combina 0.55 valor + 0.45 necessidade", () => {
    // 0.55*80 + 0.45*100 = 44 + 45 = 89
    expect(calcularScore({ valor: 80, necessidade: 100 })).toBe(89);
  });
});
