import { describe, expect, it } from "vitest";
import type { LeadStatus } from "@prisma/client";
import {
  COLUNAS_FUNIL,
  COLUNAS_SILHUETA,
  contarPorColuna,
  ESTAGIOS_FUNIL,
} from "@/lib/funil";

// F010 (revisão 2026-08-13) — Dashboard e kanban leem as MESMAS colunas.
// Spec: /specs/02-features/F010-dashboard-funil.md
const ZERADO = Object.fromEntries(
  [...ESTAGIOS_FUNIL, "descartado"].map((s) => [s, 0]),
) as Record<LeadStatus, number>;

describe("COLUNAS_SILHUETA", () => {
  it("é o kanban menos `perdidos` — vazamento lateral fica fora da silhueta", () => {
    expect(COLUNAS_SILHUETA.map((c) => c.id)).toEqual(
      COLUNAS_FUNIL.filter((c) => c.id !== "perdidos").map((c) => c.id),
    );
  });

  it("preserva a ordem do kanban: as duas telas leem na mesma sequência", () => {
    const noKanban = COLUNAS_FUNIL.map((c) => c.id).filter(
      (id) => id !== "perdidos",
    );
    expect(COLUNAS_SILHUETA.map((c) => c.id)).toEqual(noKanban);
  });

  it("não inclui `novo`: Lead sem Diagnóstico é fila de trabalho, não etapa de venda", () => {
    const cobertos = COLUNAS_SILHUETA.flatMap((c) => c.status);
    expect(cobertos).not.toContain("novo");
  });
});

describe("contarPorColuna", () => {
  it("soma os status da coluna — 'Prontos' junta priorizado e enriquecido", () => {
    const porStatus = { ...ZERADO, priorizado: 6, enriquecido: 4 };
    const prontos = contarPorColuna(porStatus, COLUNAS_SILHUETA).find(
      (c) => c.coluna.id === "prontos",
    );
    expect(prontos?.total).toBe(10);
  });

  it("o total da silhueta bate com a soma dos status que ela cobre", () => {
    const porStatus = {
      ...ZERADO,
      enriquecido: 4,
      priorizado: 6,
      contatado: 7,
      respondeu: 3,
      qualificado: 2,
      proposta: 1,
      ganho: 1,
      // Fora da silhueta de propósito — não podem entrar na soma.
      novo: 12,
      perdido: 5,
      descartado: 9,
    };
    const soma = contarPorColuna(porStatus, COLUNAS_SILHUETA).reduce(
      (t, c) => t + c.total,
      0,
    );
    expect(soma).toBe(24);
  });

  it("status sem contagem não vira NaN", () => {
    const parcial = { priorizado: 3 } as Record<LeadStatus, number>;
    const prontos = contarPorColuna(parcial, COLUNAS_SILHUETA).find(
      (c) => c.coluna.id === "prontos",
    );
    expect(prontos?.total).toBe(3);
  });

  it("sem argumento conta sobre o kanban inteiro, perdidos incluídos", () => {
    const linhas = contarPorColuna({ ...ZERADO, perdido: 5 });
    expect(linhas.find((c) => c.coluna.id === "perdidos")?.total).toBe(5);
    expect(linhas).toHaveLength(COLUNAS_FUNIL.length);
  });
});
