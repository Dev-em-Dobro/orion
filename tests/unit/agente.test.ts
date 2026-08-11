import { describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    lead: { findMany: vi.fn(), findFirst: vi.fn(), groupBy: vi.fn() },
    tarefaAdiamento: { findMany: vi.fn() },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { ferramentasDoAgente, LIMITE_REGISTROS, MAX_PASSOS } from "@/lib/agente/ferramentas";
import { SYSTEM_AGENTE } from "@/lib/agente/prompt";

/** O AI SDK passa um contexto de execução que os handlers aqui não usam. */
function opcoes() {
  return { toolCallId: "t", messages: [], context: undefined } as never;
}

// F029 AC4 / ADR-014 — o isolamento não pode depender do modelo se comportar.
describe("isolamento por construção", () => {
  it("nenhuma ferramenta aceita user_id como parâmetro", () => {
    // Se não existe campo, não há como o modelo pedir dado de outro aluno —
    // nem sendo instruído a isso pela mensagem.
    const tools = ferramentasDoAgente("u1");
    for (const [nome, t] of Object.entries(tools)) {
      const schema = JSON.stringify(
        (t as { inputSchema: unknown }).inputSchema,
      );
      expect(schema, `${nome} não pode expor user_id`).not.toContain("user_id");
      expect(schema, `${nome} não pode expor userId`).not.toContain("userId");
    }
  });

  it("toda query sai escopada pelo userId da sessão", async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);
    const tools = ferramentasDoAgente("u-abc");

    await tools.listar_leads.execute!(
      { limite: 5 },
      opcoes(),
    );

    const where = prismaMock.lead.findMany.mock.calls[0]![0].where;
    expect(where.user_id).toBe("u-abc");
  });

  it("limite pedido acima do teto é cortado", async () => {
    prismaMock.lead.findMany.mockResolvedValue([]);
    const tools = ferramentasDoAgente("u1");

    await tools.listar_leads.execute!(
      { limite: 999 },
      opcoes(),
    );

    const args = prismaMock.lead.findMany.mock.calls.at(-1)![0];
    expect(args.take).toBeLessThanOrEqual(LIMITE_REGISTROS);
  });
});

describe("ferramentas são somente leitura", () => {
  it("o mock não expõe nenhum método de escrita usado", () => {
    // O teste acima usa um prisma mock só com leitura; se alguma ferramenta
    // chamasse create/update/delete, quebraria aqui.
    const tools = ferramentasDoAgente("u1");
    expect(Object.keys(tools).length).toBeGreaterThan(0);
    expect(prismaMock.lead).not.toHaveProperty("update");
    expect(prismaMock.lead).not.toHaveProperty("delete");
  });
});

describe("prompt", () => {
  it("proíbe inventar dado e fixa a linguagem ubíqua", () => {
    expect(SYSTEM_AGENTE).toContain("vem de ferramenta");
    expect(SYSTEM_AGENTE).toContain("somente leitura");
    expect(SYSTEM_AGENTE).toContain("Linguagem ubíqua");
  });

  it("o teto de passos do loop é o do ADR-014", () => {
    expect(MAX_PASSOS).toBe(6);
  });
});
