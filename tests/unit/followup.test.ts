import { describe, expect, it } from "vitest";
import {
  filaDeFollowUp,
  FOLLOWUP_DIAS,
  limiteDaJanela,
  whereFilaFollowUp,
} from "@/lib/followup";
import type { Lead, Abordagem } from "@prisma/client";

type LeadComAbordagem = Lead & { abordagens: Abordagem[] };

function fakeLead(
  patch: Partial<Lead> & { abordagens: Abordagem[] },
): LeadComAbordagem {
  return {
    id: "l1",
    user_id: "u1",
    nome: "X",
    endereco: "Rua 1",
    telefone: null,
    website: null,
    email: null,
    email_origem: null,
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
          abordagens: [{ enviado_em: ha5 } as Abordagem],
        }),
        fakeLead({
          id: "b",
          status: "contatado",
          abordagens: [{ enviado_em: ha1 } as Abordagem],
        }),
        fakeLead({
          id: "c",
          status: "novo",
          abordagens: [{ enviado_em: ha5 } as Abordagem],
        }),
        fakeLead({ id: "d", status: "contatado", abordagens: [] }),
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
    expect(where.abordagens).toEqual({
      some: { enviado: true },
      none: { enviado: true, enviado_em: { gt: limite } },
    });
  });
});
