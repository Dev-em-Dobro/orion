import { describe, expect, it } from "vitest";
import { necessidadeEstimada, triagem } from "@/lib/score/triagem";
import { calcularScore, valor, SCORE_QUALIFICADO } from "@/lib/score/score";

// F025 — a Triagem não muda nenhum peso da F003; muda QUANDO o score é
// calculado. Estes testes travam os quatro casos da tabela da spec.
describe("necessidadeEstimada", () => {
  it("sem website → 100 (fato, não estimativa)", () => {
    expect(necessidadeEstimada(null)).toBe(100);
    expect(necessidadeEstimada("")).toBe(100);
    expect(necessidadeEstimada("   ")).toBe(100);
  });

  it("agregador/rede social → 100 (F009: não é site próprio)", () => {
    expect(necessidadeEstimada("https://linktr.ee/fulano")).toBe(100);
    expect(necessidadeEstimada("https://instagram.com/fulano")).toBe(100);
  });

  it("http:// → 65 (base 20 + 25 desconhecido + 20 sem HTTPS)", () => {
    expect(necessidadeEstimada("http://exemplo.com.br")).toBe(65);
    expect(necessidadeEstimada("HTTP://EXEMPLO.COM.BR")).toBe(65);
  });

  it("https:// → 45 (performance desconhecida)", () => {
    expect(necessidadeEstimada("https://exemplo.com.br")).toBe(45);
  });

  it("URL sem esquema não infla a Necessidade", () => {
    // Não sabemos se é HTTP; o conservador é não somar o +20.
    expect(necessidadeEstimada("exemplo.com.br")).toBe(45);
  });
});

describe("triagem", () => {
  it("usa a mesma fórmula final da F003", () => {
    const entrada = {
      categoria: "dentist",
      num_avaliacoes: 150,
      website: null,
    };
    const r = triagem(entrada);
    const v = valor({ categoria: "dentist", num_avaliacoes: 150 });

    expect(r.valor).toBe(v.valor);
    expect(r.tier).toBe("ALTO");
    expect(r.necessidade).toBe(100);
    expect(r.score).toBe(
      calcularScore({ valor: v.valor, necessidade: 100 }),
    );
  });

  it("dentista sem site com muitas avaliações é o alvo ideal", () => {
    const r = triagem({
      categoria: "dentist",
      num_avaliacoes: 400,
      website: null,
    });
    expect(r.score).toBeGreaterThanOrEqual(SCORE_QUALIFICADO);
  });

  it("nicho não mapeado com site https fica no fundo da fila", () => {
    const r = triagem({
      categoria: "inventado_xyz",
      num_avaliacoes: 3,
      website: "https://tem-site.com",
    });
    expect(r.tier).toBe("BAIXO");
    expect(r.score).toBeLessThan(SCORE_QUALIFICADO);
  });
});
