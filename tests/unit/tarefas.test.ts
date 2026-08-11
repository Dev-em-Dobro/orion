import { describe, expect, it } from "vitest";
import {
  calcularTarefas,
  type Adiamento,
  type LeadParaTarefa,
} from "@/lib/tarefas/calcular";
import { PRAZOS } from "@/lib/tarefas/regras";

const AGORA = Date.UTC(2026, 7, 10, 12, 0, 0);
const HORA = 3_600_000;
const DIA = 86_400_000;

function lead(patch: Partial<LeadParaTarefa> = {}): LeadParaTarefa {
  return {
    id: "l1",
    nome: "Barbearia X",
    status: "contatado",
    status_em: new Date(AGORA),
    score: 70,
    telefone: "(41) 90000-0000",
    outreaches: [],
    ...patch,
  };
}

function enviada(quandoMs: number) {
  return {
    enviado: true,
    enviado_em: new Date(quandoMs),
    gerado_em: new Date(quandoMs),
  };
}

function gerada(quandoMs: number) {
  return { enviado: false, enviado_em: null, gerado_em: new Date(quandoMs) };
}

function calc(leads: LeadParaTarefa[], adiamentos: Adiamento[] = []) {
  return calcularTarefas(
    { leads, adiamentos, aguardandoAprofundamento: 0 },
    AGORA,
  );
}

describe("CONFIRMAR_RESPOSTA (o pedido que originou a feature)", () => {
  it("aparece com 13h sem desfecho", () => {
    const t = calc([lead({ outreaches: [enviada(AGORA - 13 * HORA)] })]);
    expect(t).toHaveLength(1);
    expect(t[0]?.tipo).toBe("CONFIRMAR_RESPOSTA");
  });

  it("não aparece com 11h", () => {
    expect(calc([lead({ outreaches: [enviada(AGORA - 11 * HORA)] })])).toEqual(
      [],
    );
  });
});

describe("exclusão mútua com MANDAR_FOLLOWUP", () => {
  it("passados 3 dias, vira follow-up e NÃO empilha as duas", () => {
    const t = calc([lead({ outreaches: [enviada(AGORA - 4 * DIA)] })]);
    expect(t).toHaveLength(1);
    expect(t[0]?.tipo).toBe("MANDAR_FOLLOWUP");
  });

  it("follow-up enviado hoje zera a cobrança", () => {
    // O envio mais recente é o que conta, não o mais antigo.
    const t = calc([
      lead({ outreaches: [enviada(AGORA - 1 * HORA), enviada(AGORA - 5 * DIA)] }),
    ]);
    expect(t).toEqual([]);
  });
});

describe("demais tipos", () => {
  it("ENVIAR_ABORDAGEM: gerada há 25h e não enviada", () => {
    const t = calc([
      lead({ status: "priorizado", outreaches: [gerada(AGORA - 25 * HORA)] }),
    ]);
    expect(t[0]?.tipo).toBe("ENVIAR_ABORDAGEM");
  });

  it("AVANCAR_RESPONDEU usa status_em", () => {
    const t = calc([
      lead({ status: "respondeu", status_em: new Date(AGORA - 3 * DIA) }),
    ]);
    expect(t[0]?.tipo).toBe("AVANCAR_RESPONDEU");
  });

  it("COBRAR_PROPOSTA depois de 3 dias parada", () => {
    const t = calc([
      lead({ status: "proposta", status_em: new Date(AGORA - 4 * DIA) }),
    ]);
    expect(t[0]?.tipo).toBe("COBRAR_PROPOSTA");
  });

  it("APROFUNDAR_FILA é UMA só, agregada", () => {
    const t = calcularTarefas(
      { leads: [], adiamentos: [], aguardandoAprofundamento: 17 },
      AGORA,
    );
    expect(t).toHaveLength(1);
    expect(t[0]?.tipo).toBe("APROFUNDAR_FILA");
    expect(t[0]?.quantidade).toBe(17);
  });
});

describe("status fora do jogo", () => {
  it("descartado, ganho e perdido não geram cobrança", () => {
    for (const status of ["descartado", "ganho", "perdido"] as const) {
      const t = calc([
        lead({ status, outreaches: [enviada(AGORA - 10 * DIA)] }),
      ]);
      expect(t).toEqual([]);
    }
  });
});

describe("adiar e dispensar", () => {
  const marco = new Date(AGORA - 13 * HORA);
  const base = lead({ outreaches: [enviada(marco.getTime())] });

  it("adiada some até o prazo e volta depois", () => {
    const adiada: Adiamento = {
      lead_id: "l1",
      tipo: "CONFIRMAR_RESPOSTA",
      marco,
      adiada_ate: new Date(AGORA + 2 * HORA),
      dispensada_em: null,
    };
    expect(calc([base], [adiada])).toEqual([]);

    const vencida: Adiamento = {
      ...adiada,
      adiada_ate: new Date(AGORA - 1 * HORA),
    };
    expect(calc([base], [vencida])).toHaveLength(1);
  });

  it("dispensada some", () => {
    const d: Adiamento = {
      lead_id: "l1",
      tipo: "CONFIRMAR_RESPOSTA",
      marco,
      adiada_ate: null,
      dispensada_em: new Date(AGORA),
    };
    expect(calc([base], [d])).toEqual([]);
  });

  it("marco novo traz a cobrança de volta mesmo dispensada", () => {
    // Sem isso, dispensar viraria silêncio permanente.
    const d: Adiamento = {
      lead_id: "l1",
      tipo: "CONFIRMAR_RESPOSTA",
      marco: new Date(AGORA - 10 * DIA),
      adiada_ate: null,
      dispensada_em: new Date(AGORA - 9 * DIA),
    };
    expect(calc([base], [d])).toHaveLength(1);
  });
});

describe("ordenação", () => {
  it("a mais atrasada vem primeiro", () => {
    const t = calc([
      lead({ id: "a", outreaches: [enviada(AGORA - 13 * HORA)] }),
      lead({
        id: "b",
        status: "proposta",
        status_em: new Date(AGORA - 30 * DIA),
      }),
    ]);
    expect(t[0]?.leadId).toBe("b");
    expect(t[0]?.atrasoMs).toBeGreaterThan(t[1]!.atrasoMs);
  });

  it("prazos batem com a spec", () => {
    expect(PRAZOS.CONFIRMAR_RESPOSTA).toBe(12 * HORA);
    expect(PRAZOS.MANDAR_FOLLOWUP).toBe(3 * DIA);
    expect(PRAZOS.ENVIAR_ABORDAGEM).toBe(24 * HORA);
    expect(PRAZOS.AVANCAR_RESPONDEU).toBe(2 * DIA);
    expect(PRAZOS.COBRAR_PROPOSTA).toBe(3 * DIA);
  });
});
