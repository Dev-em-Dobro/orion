import { describe, expect, it } from "vitest";
import {
  ESTAGIOS_EM_ABERTO,
  FUNIL_VENDA,
  podeRegistrarDesfecho,
  taxasDeConversao,
} from "@/lib/funil";
import type { LeadStatus } from "@prisma/client";

describe("podeRegistrarDesfecho", () => {
  it("permite perdido de qualquer estágio", () => {
    expect(podeRegistrarDesfecho("novo", "perdido")).toBe(true);
    expect(podeRegistrarDesfecho("proposta", "perdido")).toBe(true);
  });

  it("só avança (ou mantém) no funil", () => {
    expect(podeRegistrarDesfecho("contatado", "respondeu")).toBe(true);
    expect(podeRegistrarDesfecho("respondeu", "contatado")).toBe(false);
    expect(podeRegistrarDesfecho("qualificado", "qualificado")).toBe(true);
    expect(podeRegistrarDesfecho("contatado", "ganho")).toBe(true);
  });
});

describe("taxasDeConversao", () => {
  const zero = Object.fromEntries(
    (
      [
        "novo",
        "enriquecido",
        "priorizado",
        "contatado",
        "respondeu",
        "qualificado",
        "proposta",
        "ganho",
        "perdido",
      ] as LeadStatus[]
    ).map((s) => [s, 0]),
  ) as Record<LeadStatus, number>;

  it("origem 0 → taxa null", () => {
    const passos = taxasDeConversao(zero);
    expect(passos).toHaveLength(FUNIL_VENDA.length - 1);
    expect(passos.every((p) => p.taxa === null)).toBe(true);
  });

  it("calcula taxas de snapshot (alcançou X ou posterior)", () => {
    const por = { ...zero, contatado: 10, respondeu: 4, qualificado: 2, ganho: 1 };
    const passos = taxasDeConversao(por);
    // alcancou contatado = 10+4+2+1 = 17; próxima = 4+2+1 = 7 → 7/17
    expect(passos[0]).toMatchObject({
      de: "contatado",
      para: "respondeu",
      taxa: 7 / 17,
    });
  });

  it("ESTAGIOS_EM_ABERTO não inclui desfechos", () => {
    expect(ESTAGIOS_EM_ABERTO).not.toContain("ganho");
    expect(ESTAGIOS_EM_ABERTO).not.toContain("perdido");
  });
});
