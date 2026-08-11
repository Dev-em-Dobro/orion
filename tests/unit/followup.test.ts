import { describe, expect, it } from "vitest";
import {
  filaDeFollowUp,
  FOLLOWUP_DIAS,
  limiteDaJanela,
  whereFilaFollowUp,
} from "@/lib/followup";
import type { Lead, Outreach } from "@prisma/client";

type LeadComOutreach = Lead & { outreaches: Outreach[] };

function fakeLead(
  patch: Partial<Lead> & { outreaches: Outreach[] },
): LeadComOutreach {
  return {
    id: "l1",
    user_id: "u1",
    nome: "X",
    endereco: "Rua 1",
    telefone: null,
    website: null,
    categoria: "cafe",
    nota: null,
    num_avaliacoes: null,
    place_id: "p1",
    status: "contatado",
    status_em: new Date(),
    motivo_descarte: null,
    score: 0,
    score_estimado: true,
    created_at: new Date(),
    updated_at: new Date(),
    ...patch,
  };
}

describe("filaDeFollowUp", () => {
  const agora = Date.UTC(2026, 6, 15);

  it(`só inclui contatado com envio há ≥ ${FOLLOWUP_DIAS} dias`, () => {
    const ha5 = new Date(agora - 5 * 86_400_000);
    const ha1 = new Date(agora - 1 * 86_400_000);

    const fila = filaDeFollowUp(
      [
        fakeLead({
          id: "a",
          status: "contatado",
          outreaches: [{ enviado_em: ha5 } as Outreach],
        }),
        fakeLead({
          id: "b",
          status: "contatado",
          outreaches: [{ enviado_em: ha1 } as Outreach],
        }),
        fakeLead({
          id: "c",
          status: "novo",
          outreaches: [{ enviado_em: ha5 } as Outreach],
        }),
        fakeLead({ id: "d", status: "contatado", outreaches: [] }),
      ],
      agora,
    );

    expect(fila).toHaveLength(1);
    expect(fila[0]?.lead.id).toBe("a");
    expect(fila[0]?.dias).toBe(5);
  });
});

// F028 — a fila passou a ser filtrada no banco. Estes testes travam a forma da
// cláusula: é ela que garante que a página não carrega todos os contatados.
describe("whereFilaFollowUp", () => {
  const agora = Date.UTC(2026, 6, 15);
  const limite = limiteDaJanela(agora);

  it("limite é FOLLOWUP_DIAS atrás", () => {
    expect(agora - limite.getTime()).toBe(FOLLOWUP_DIAS * 86_400_000);
  });

  it("exige contatado, com envio, e nenhum envio depois do limite", () => {
    const where = whereFilaFollowUp(limite);

    expect(where.status).toBe("contatado");
    // `some` sozinho traria de volta quem já recebeu follow-up hoje (ele tem
    // um envio antigo). O `none` é o que fecha a janela pelo envio mais recente.
    expect(where.outreaches).toEqual({
      some: { enviado: true },
      none: { enviado: true, enviado_em: { gt: limite } },
    });
  });
});
