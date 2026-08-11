// F035 — planos, limites e competência. Tudo puro, sem Prisma e sem Next.
// Spec: /specs/02-features/F035-planos-e-limites.md

import { describe, expect, it } from "vitest";
import {
  CATALOGO_PLANOS,
  PLANOS,
  RECURSOS,
  asPlano,
  limiteMensal,
  melhorPlano,
  planoQueAbre,
  precoFormatado,
  temRecurso,
} from "@/lib/planos/catalogo";
import { competenciaDe, rotuloCompetencia } from "@/lib/planos/competencia";
import { LimiteDoPlanoError, RecursoDoPlanoError } from "@/lib/planos/erros";
import { planoDosEntitlements } from "@/lib/planos/resolver";
import type { Plano } from "@/lib/planos/catalogo";

describe("F035 — catálogo", () => {
  it("AC1 — free é o padrão e vale 50 Leads/mês", () => {
    expect(CATALOGO_PLANOS.free.leadsDiagnosticadosMes).toBe(50);
    expect(melhorPlano([])).toBe("free");
  });

  it("precedência agencia > pro > free", () => {
    expect(melhorPlano(["free", "pro"])).toBe("pro");
    expect(melhorPlano(["pro", "agencia"])).toBe("agencia");
    expect(melhorPlano(["agencia", "free", "pro"])).toBe("agencia");
  });

  it("AC9 — free não abre nenhum recurso pago", () => {
    for (const r of RECURSOS) {
      expect(temRecurso("free", r)).toBe(false);
      expect(temRecurso("pro", r)).toBe(true);
      expect(temRecurso("agencia", r)).toBe(true);
    }
  });

  it("o limite cresce com o plano (senão não haveria por que subir)", () => {
    const valores = PLANOS.map((p) => CATALOGO_PLANOS[p].leadsDiagnosticadosMes);
    const ordenado = [...valores].sort((a, b) => a - b);
    expect(valores).toEqual(ordenado);
    expect(new Set(valores).size).toBe(valores.length);
  });

  it("planoQueAbre devolve o menor plano pago", () => {
    expect(planoQueAbre("email")).toBe("pro");
    expect(planoQueAbre("agente")).toBe("pro");
  });

  it("asPlano rejeita string que não é plano", () => {
    expect(asPlano("pro")).toBe("pro");
    expect(asPlano("premium")).toBeNull();
    expect(asPlano(null)).toBeNull();
    expect(asPlano(undefined)).toBeNull();
  });

  it("preço formatado em BRL", () => {
    expect(precoFormatado("free")).toBe("Grátis");
    expect(precoFormatado("pro")).toBe("R$ 39,00/mês");
    expect(precoFormatado("agencia")).toBe("R$ 97,00/mês");
  });
});

describe("F035 — bônus BYOK", () => {
  it("AC5 — BYOK NÃO isenta o Free: continua 50", () => {
    expect(limiteMensal("free", false)).toBe(50);
    expect(limiteMensal("free", true)).toBe(50);
  });

  it("AC6 — plano pago em BYOK dobra", () => {
    expect(limiteMensal("pro", false)).toBe(300);
    expect(limiteMensal("pro", true)).toBe(600);
    expect(limiteMensal("agencia", true)).toBe(3000);
  });
});

describe("F035 — plano vindo dos entitlements", () => {
  const mapa = new Map<string, Plano>([
    ["prod_pro", "pro"],
    ["prod_agencia", "agencia"],
  ]);

  it("AC1 — sem entitlement de plano é free", () => {
    expect(planoDosEntitlements(mapa, [])).toBe("free");
    expect(planoDosEntitlements(mapa, ["prod_curso"])).toBe("free");
  });

  it("mapeia e escolhe o maior quando há mais de um", () => {
    expect(planoDosEntitlements(mapa, ["prod_pro"])).toBe("pro");
    expect(planoDosEntitlements(mapa, ["prod_pro", "prod_agencia"])).toBe(
      "agencia",
    );
  });

  it("mapa vazio (nenhum plano configurado na Hubla) → todo mundo free", () => {
    expect(planoDosEntitlements(new Map(), ["prod_pro"])).toBe("free");
  });
});

describe("F035 — competência (America/Sao_Paulo)", () => {
  it("usa o mês de São Paulo, não o de UTC", () => {
    // 01/09 00:30 UTC = 31/08 21:30 em SP. O aluno ainda está em agosto.
    expect(competenciaDe(new Date("2026-09-01T00:30:00Z"))).toBe("2026-08");
    // 01/09 04:00 UTC = 01/09 01:00 em SP: setembro nos dois.
    expect(competenciaDe(new Date("2026-09-01T04:00:00Z"))).toBe("2026-09");
  });

  it("AC8 — a virada de mês é chave nova, sem job", () => {
    const fim = competenciaDe(new Date("2026-08-31T12:00:00Z"));
    const inicio = competenciaDe(new Date("2026-09-01T12:00:00Z"));
    expect(fim).toBe("2026-08");
    expect(inicio).toBe("2026-09");
    expect(fim).not.toBe(inicio);
  });

  it("rótulo humano", () => {
    expect(rotuloCompetencia("2026-08")).toBe("agosto de 2026");
  });
});

describe("F035 — mensagens de erro", () => {
  it("LimiteDoPlanoError diz o número, o plano e o que continua funcionando", () => {
    const e = new LimiteDoPlanoError("free", 50, 50);
    expect(e.message).toContain("50");
    expect(e.message).toContain("Free");
    expect(e.message).toContain("busca");
    expect(e.name).toBe("LimiteDoPlanoError");
  });

  it("RecursoDoPlanoError aponta o plano que abre", () => {
    const e = new RecursoDoPlanoError("tarefas", "free");
    expect(e.message).toContain("Central de Tarefas");
    expect(e.message).toContain("Pro");
  });
});
