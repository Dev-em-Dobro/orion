import { describe, expect, it } from "vitest";
import type { LeadStatus } from "@prisma/client";
import {
  ESTAGIOS_COM_PROPOSTA,
  ESTAGIOS_FUNIL,
  podeMontarProposta,
} from "@/lib/funil";

// F012 (emenda 2026-08-13) — a aba Proposta só abre a partir de `qualificado`.
// Spec: /specs/02-features/F012-gerador-de-proposta.md
describe("podeMontarProposta", () => {
  it("libera de `qualificado` pra frente (AC11)", () => {
    for (const st of ["qualificado", "proposta", "ganho"] as LeadStatus[]) {
      expect(podeMontarProposta(st), st).toBe(true);
    }
  });

  it("bloqueia tudo antes de `qualificado` (AC10)", () => {
    for (const st of [
      "novo",
      "enriquecido",
      "priorizado",
      "contatado",
      "respondeu",
    ] as LeadStatus[]) {
      expect(podeMontarProposta(st), st).toBe(false);
    }
  });

  it("`perdido` e `descartado` não reabrem a aba", () => {
    expect(podeMontarProposta("perdido")).toBe(false);
    expect(podeMontarProposta("descartado")).toBe(false);
  });

  it("a trava é contígua: nenhum buraco no meio do funil", () => {
    // Uma vez liberado, não volta a bloquear conforme o Lead avança —
    // senão o aluno perderia a aba ao mover o card no kanban.
    const ordem = ESTAGIOS_FUNIL.filter((s) => s !== "perdido");
    const primeiro = ordem.findIndex(podeMontarProposta);
    expect(primeiro).toBeGreaterThan(0);
    expect(ordem.slice(primeiro).every(podeMontarProposta)).toBe(true);
  });

  it("todo estágio liberado é um estágio real do funil", () => {
    for (const st of ESTAGIOS_COM_PROPOSTA) {
      expect(ESTAGIOS_FUNIL, st).toContain(st);
    }
  });
});
