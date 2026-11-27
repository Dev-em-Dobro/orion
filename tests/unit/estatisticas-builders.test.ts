// F044 — contrato, autorização e montagem das estatísticas para o Builders.
// Spec: /specs/02-features/F044-estatisticas-builders.md

import { describe, expect, it } from "vitest";
import {
  MAX_EMAILS, autorizado, corpoSchema, funilDoStatus, montarResultados,
} from "@/lib/integracoes/builders-estatisticas";

describe("corpo", () => {
  const base = { emails: ["Ana@Exemplo.com "], desde: "2026-12-01", ate: "2027-01-14" };

  it("normaliza e deduplica e-mails", () => {
    const r = corpoSchema.parse({ ...base, emails: ["Ana@Exemplo.com", " ana@exemplo.com", "bia@x.dev"] });
    expect(r.emails).toEqual(["ana@exemplo.com", "bia@x.dev"]);
  });

  it("recusa mais de 500 e-mails, vazio e e-mail inválido", () => {
    const muitos = Array.from({ length: MAX_EMAILS + 1 }, (_, i) => `a${i}@x.dev`);
    expect(corpoSchema.safeParse({ ...base, emails: muitos }).success).toBe(false);
    expect(corpoSchema.safeParse({ ...base, emails: Array.from({ length: MAX_EMAILS }, (_, i) => `a${i}@x.dev`) }).success).toBe(true);
    expect(corpoSchema.safeParse({ ...base, emails: [] }).success).toBe(false);
    expect(corpoSchema.safeParse({ ...base, emails: ["não é e-mail"] }).success).toBe(false);
  });

  it("recusa data inválida, janela invertida e janela longa", () => {
    expect(corpoSchema.safeParse({ ...base, desde: "2026-02-30" }).success).toBe(false);
    expect(corpoSchema.safeParse({ ...base, desde: "2027-01-15" }).success).toBe(false);
    expect(corpoSchema.safeParse({ ...base, desde: "2026-01-01" }).success).toBe(false);
  });
});

describe("autorização", () => {
  it("exige Bearer com o segredo exato", () => {
    expect(autorizado("Bearer segredo-forte", "segredo-forte")).toBe(true);
    expect(autorizado("bearer segredo-forte", "segredo-forte")).toBe(true);
    expect(autorizado("Bearer segredo-errado", "segredo-forte")).toBe(false);
    expect(autorizado("segredo-forte", "segredo-forte")).toBe(false);
    expect(autorizado(null, "segredo-forte")).toBe(false);
  });
});

describe("funil", () => {
  it("Lead conta no estágio atual e nos anteriores; perdido não conta", () => {
    expect(funilDoStatus([
      { status: "respondeu", total: 3 }, { status: "proposta", total: 1 },
      { status: "ganho", total: 2 }, { status: "perdido", total: 9 },
    ])).toEqual({ respondeu: 6, qualificado: 3, proposta: 3, ganho: 2 });
  });
});

describe("montagem", () => {
  it("um resultado por e-mail, sem misturar contas e sem dados de Lead", () => {
    const usuarios = new Map([["ana@x.dev", "u-ana"], ["bia@x.dev", "u-bia"]]);
    const r = montarResultados(
      ["ana@x.dev", "sem@x.dev", "bia@x.dev"],
      usuarios,
      [
        { userId: "u-ana", data: "2026-12-03", abordagens: 2, retornos: 0 },
        { userId: "u-bia", data: "2026-12-02", abordagens: 5, retornos: 1 },
        { userId: "u-ana", data: "2026-12-02", abordagens: 1, retornos: 3 },
      ],
      [{ userId: "u-bia", status: "qualificado", total: 1 }],
    );
    expect(r.map((x) => x.email)).toEqual(["ana@x.dev", "sem@x.dev", "bia@x.dev"]);
    expect(r[0]).toEqual({
      email: "ana@x.dev", encontrado: true,
      dias: [{ data: "2026-12-02", abordagens: 1, retornos: 3 }, { data: "2026-12-03", abordagens: 2, retornos: 0 }],
      funil: { respondeu: 0, qualificado: 0, proposta: 0, ganho: 0 },
    });
    expect(r[1]).toMatchObject({ encontrado: false, dias: [] });
    expect(r[2]!.funil).toEqual({ respondeu: 1, qualificado: 1, proposta: 0, ganho: 0 });
    expect(JSON.stringify(r)).not.toMatch(/userId|u-ana|u-bia/);
  });
});
