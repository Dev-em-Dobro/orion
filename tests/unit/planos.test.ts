// F035 — planos, limites e competência. Tudo puro, sem Prisma e sem Next.
// Spec: /specs/02-features/F035-planos-e-limites.md

import { describe, expect, it } from "vitest";
import {
  CATALOGO_PLANOS,
  OPERACOES_MENSAIS,
  PLANOS,
  RECURSOS,
  asPlano,
  limiteDaOperacao,
  limiteMensal,
  melhorPlano,
  planoQueAbre,
  precoAlunoFormatado,
  precoFormatado,
  temRecurso,
} from "@/lib/planos/catalogo";
import { competenciaDe, rotuloCompetencia } from "@/lib/planos/competencia";
import { LimiteDoPlanoError, RecursoDoPlanoError } from "@/lib/planos/erros";
import { planoDosEntitlements } from "@/lib/planos/resolver";
import type { Plano } from "@/lib/planos/catalogo";

describe("F035 — catálogo", () => {
  it("AC1 — free é o padrão e vale 60 Leads novos/mês", () => {
    // 60 = 3 páginas exatas do Places e ~333 alunos dentro do free tier do
    // Google (11 §4). Mudar isso é mudar a conta de custo.
    expect(CATALOGO_PLANOS.free.limites.lead_novo).toBe(60);
    expect(limiteMensal("free")).toBe(60);
    expect(melhorPlano([])).toBe("free");
  });

  it("precedência agencia > pro > free", () => {
    expect(melhorPlano(["free", "pro"])).toBe("pro");
    expect(melhorPlano(["pro", "agencia"])).toBe("agencia");
    expect(melhorPlano(["agencia", "free", "pro"])).toBe("agencia");
  });

  // Revisão de 2026-08-13: nada é bloqueado por plano, tudo é limitado.
  it("todo plano abre todo recurso — o que separa é volume", () => {
    for (const r of RECURSOS) {
      for (const p of PLANOS) expect(temRecurso(p, r)).toBe(true);
    }
  });

  it("o limite de TODA operação cresce com o plano", () => {
    for (const op of OPERACOES_MENSAIS) {
      const valores = PLANOS.map((p) => limiteDaOperacao(p, op));
      const ordenado = [...valores].sort((a, b) => a - b);
      expect(valores, `operação ${op}`).toEqual(ordenado);
      expect(new Set(valores).size, `operação ${op}`).toBe(valores.length);
    }
  });

  it("nenhuma operação mensal fica sem limite definido", () => {
    for (const p of PLANOS) {
      for (const op of OPERACOES_MENSAIS) {
        expect(limiteDaOperacao(p, op), `${p}.${op}`).toBeGreaterThan(0);
      }
    }
  });

  it("o Agente no Free é aperitivo: 5 no mês", () => {
    expect(limiteDaOperacao("free", "agente_msg")).toBe(5);
    expect(limiteDaOperacao("free", "simulador_msg")).toBe(20);
  });

  it("planoQueAbre continua funcionando pra quando voltar recurso fechado", () => {
    // Hoje o Free abre tudo, então o menor plano que abre é o próprio free.
    expect(planoQueAbre("agente")).toBe("free");
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

  it("preço de aluno aplica os 20% e não existe no Free", () => {
    expect(precoAlunoFormatado("free")).toBeNull();
    expect(precoAlunoFormatado("pro")).toBe("R$ 31,20/mês");
    expect(precoAlunoFormatado("agencia")).toBe("R$ 77,60/mês");
  });
});

// O bônus de BYOK morreu com o fim do BYOK (F035, "Fim do BYOK"): ele existia
// porque BYOK zerava nosso custo variável, e sem BYOK novo não há o que
// compensar. `limiteMensal` passou a depender só do plano.
describe("F035 — teto mensal de Leads novos", () => {
  it("depende só do plano", () => {
    expect(limiteMensal("free")).toBe(60);
    expect(limiteMensal("pro")).toBe(300);
    expect(limiteMensal("agencia")).toBe(800);
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
    const e = new LimiteDoPlanoError("free", 60, 60);
    expect(e.message).toContain("60");
    expect(e.message).toContain("Free");
    expect(e.message).toContain("planos");
    expect(e.name).toBe("LimiteDoPlanoError");
  });

  // São seis contadores desde 2026-08-13: sem nomear a operação, o aluno não
  // sabe o que acabou.
  it("LimiteDoPlanoError nomeia a operação que estourou", () => {
    const e = new LimiteDoPlanoError("free", 5, 5, "agente_msg");
    expect(e.message.toLowerCase()).toContain("perguntas ao agente");
  });

  // Dormente desde 2026-08-13: nenhum recurso está fechado, então na prática
  // este erro não é lançado. O teste existe pra a máquina continuar de pé —
  // se voltar a existir recurso pago, ela volta com ele.
  it("RecursoDoPlanoError nomeia o recurso", () => {
    const e = new RecursoDoPlanoError("tarefas", "free");
    expect(e.message).toContain("Central de Tarefas");
    expect(e.name).toBe("RecursoDoPlanoError");
  });
});
