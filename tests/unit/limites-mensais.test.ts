// F035 (2026-08-13) — os tetos mensais que definem o plano.
// Spec: /specs/02-features/F035-planos-e-limites.md
//
// Puro: só catálogo e competência. O incremento (`consumirMensal`) fala com o
// Prisma e fica fora daqui — o que se prova aqui é a régua.

import { describe, expect, it } from "vitest";
import {
  CATALOGO_PLANOS,
  OPERACOES_MENSAIS,
  PLANOS,
  limiteDaOperacao,
} from "@/lib/planos/catalogo";
import { competenciaDe } from "@/lib/planos/competencia";
import { LimiteDoPlanoError } from "@/lib/planos/erros";
import { QUANTIDADES } from "@/lib/leads/aprofundamento";

describe("F035 — teto mensal por operação", () => {
  it("o Free cabe no free tier do Google (11 §4)", () => {
    // 40 Leads = 2 páginas de 20. Com 1.000 requisições grátis por mês na
    // conta inteira, isso são ~500 alunos Free a custo zero de Places. Era 60
    // (3 páginas, ~333 alunos) até 2026-08-16: depois que Abordagem e Proposta
    // zeraram, o Places virou quase todo o custo do Free, e o teto passou a ser
    // — sem intermediário — a escolha de quantos alunos gratuitos cabem.
    const leads = limiteDaOperacao("free", "lead_novo");
    expect(leads).toBe(40);
    expect(leads % 20).toBe(0);
    expect(Math.floor(1000 / (leads / 20))).toBeGreaterThanOrEqual(500);
  });

  it("o teto do Free é um número inteiro de buscas — sem colisão", () => {
    // A colisão que existia: teto 50 com opções 20/60/100 fazia com que NENHUMA
    // opção coubesse num mês Free — o aluno não tinha uma escolha que desse
    // certo. O que protege contra isso não é o teto ser uma opção (era assim
    // com 60), e sim **existir opção que cabe e feche a conta exata**: com 40,
    // duas buscas de 20 são exatamente um mês.
    const teto = limiteDaOperacao("free", "lead_novo");
    const cabem = QUANTIDADES.filter((q) => q <= teto && teto % q === 0);
    expect(cabem.length).toBeGreaterThan(0);
    expect(Math.min(...cabem)).toBe(20);
  });

  it("toda opção de busca cai em página cheia do Places", () => {
    for (const q of QUANTIDADES) expect(q % 20).toBe(0);
  });

  it("todo plano define todas as operações, e sempre crescendo", () => {
    for (const op of OPERACOES_MENSAIS) {
      const valores = PLANOS.map((p) => limiteDaOperacao(p, op));
      expect(valores.every((v) => v > 0), `operação ${op}`).toBe(true);
      expect(valores, `operação ${op}`).toEqual(
        [...valores].sort((a, b) => a - b),
      );
    }
  });

  it("o catálogo não tem operação órfã nem sobrando", () => {
    for (const p of PLANOS) {
      expect(Object.keys(CATALOGO_PLANOS[p].limites).sort()).toEqual(
        [...OPERACOES_MENSAIS].sort(),
      );
    }
  });
});

describe("F035 — a competência é a chave, não um job", () => {
  it("virada de mês troca a chave (AC3/AC8)", () => {
    expect(competenciaDe(new Date("2026-08-31T12:00:00Z"))).toBe("2026-08");
    expect(competenciaDe(new Date("2026-09-01T12:00:00Z"))).toBe("2026-09");
  });

  it("fuso de São Paulo: 31/08 às 22h ainda é agosto (AC4)", () => {
    // 01/09 01:00 UTC = 31/08 22:00 em SP.
    expect(competenciaDe(new Date("2026-09-01T01:00:00Z"))).toBe("2026-08");
  });
});

describe("F035 — a mensagem de limite nomeia o que acabou", () => {
  it("cada operação produz uma mensagem própria", () => {
    for (const op of OPERACOES_MENSAIS) {
      const limite = limiteDaOperacao("free", op);
      const e = new LimiteDoPlanoError("free", limite, limite, op);
      expect(e.message).toContain(String(limite));
      expect(e.message).toContain("Free");
      // "para liberar mais, veja os planos" — o CTA não pode sumir.
      expect(e.message).toContain("planos");
    }
  });

  it("sem operação, ainda diz algo útil", () => {
    const e = new LimiteDoPlanoError("pro", 300, 300);
    expect(e.message).toContain("300");
    expect(e.message).toContain("Pro");
  });
});
