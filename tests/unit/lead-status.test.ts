import { describe, expect, it } from "vitest";
import { mudarStatus, statusAoRestaurar } from "@/lib/leads/status";
import {
  COLUNAS_FUNIL,
  colunaDoStatus,
  ESTAGIOS_FUNIL,
  ESTAGIOS_EM_ABERTO,
  ONDE_NAO_DESCARTADO,
  podeRegistrarDesfecho,
  STATUS_DESCARTADO,
  STATUS_DO_BOARD,
  statusAoMover,
} from "@/lib/funil";

// F024 — o valor deste helper é não deixar ninguém esquecer `status_em`.
describe("mudarStatus", () => {
  const agora = new Date("2026-08-10T12:00:00.000Z");

  it("sempre grava status e status_em", () => {
    expect(mudarStatus("contatado", { agora })).toEqual({
      status: "contatado",
      status_em: agora,
      motivo_descarte: null,
    });
  });

  it("guarda o motivo só quando descarta", () => {
    expect(
      mudarStatus("descartado", { motivo: "  já tem site ótimo  ", agora }),
    ).toEqual({
      status: "descartado",
      status_em: agora,
      motivo_descarte: "já tem site ótimo",
    });
  });

  it("motivo vazio vira null", () => {
    const dados = mudarStatus("descartado", { motivo: "   ", agora });
    expect(dados.motivo_descarte).toBeNull();
  });

  it("sair de descartado limpa o motivo", () => {
    // Restaurar não pode deixar para trás o motivo de um descarte desfeito.
    const dados = mudarStatus("priorizado", { motivo: "sobra", agora });
    expect(dados.motivo_descarte).toBeNull();
  });
});

describe("statusAoRestaurar", () => {
  it("com score confirmado volta pronto pra abordagem", () => {
    expect(statusAoRestaurar(true)).toBe("priorizado");
  });

  it("sem diagnóstico volta pro começo da esteira", () => {
    expect(statusAoRestaurar(false)).toBe("novo");
  });
});

describe("descartado no funil", () => {
  it("não é etapa do funil", () => {
    expect(ESTAGIOS_FUNIL).not.toContain(STATUS_DESCARTADO);
    expect(ESTAGIOS_EM_ABERTO).not.toContain(STATUS_DESCARTADO);
  });

  it("tem fragmento de where para esconder da visão padrão", () => {
    expect(ONDE_NAO_DESCARTADO).toEqual({ status: { not: "descartado" } });
  });

  it("registrar desfecho não tira um Lead de descartado", () => {
    // Pra sair de descartado existe o Restaurar (ou o Corrigir status).
    expect(podeRegistrarDesfecho("descartado", "respondeu")).toBe(false);
    expect(podeRegistrarDesfecho("descartado", "ganho")).toBe(true);
  });
});

// F034 — as colunas do board são o Lead.status agrupado, não entidade nova.
describe("colunas do funil (F034)", () => {
  it("novo e descartado não têm coluna", () => {
    expect(STATUS_DO_BOARD).not.toContain("novo");
    expect(STATUS_DO_BOARD).not.toContain(STATUS_DESCARTADO);
  });

  it("todo status do board pertence a exatamente uma coluna", () => {
    for (const status of STATUS_DO_BOARD) {
      const colunas = COLUNAS_FUNIL.filter((c) => c.status.includes(status));
      expect(colunas).toHaveLength(1);
    }
  });

  it("mover para uma coluna assume o primeiro status dela", () => {
    // "Prontos" agrupa priorizado + enriquecido; soltar ali vira priorizado.
    expect(statusAoMover("prontos")).toBe("priorizado");
    expect(statusAoMover("abordados")).toBe("contatado");
    expect(statusAoMover("inexistente")).toBeNull();
  });

  it("colunaDoStatus e statusAoMover são consistentes", () => {
    for (const coluna of COLUNAS_FUNIL) {
      const primeiro = coluna.status[0]!;
      expect(colunaDoStatus(primeiro)?.id).toBe(coluna.id);
      expect(statusAoMover(coluna.id)).toBe(primeiro);
    }
  });
});
