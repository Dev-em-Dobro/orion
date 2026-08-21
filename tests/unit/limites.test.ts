import { afterEach, describe, expect, it, vi } from "vitest";
import { OPERACOES_COTA } from "@/lib/limites/tipos";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    userApiKeys: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    dailyUsage: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      updateManyAndReturn: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

vi.mock("@/lib/chaves/modo", () => ({
  obterModoChave: vi.fn().mockResolvedValue("orion"),
}));

import { obterModoChave } from "@/lib/chaves/modo";
import { dataHojeBr } from "@/lib/limites/data";
import { QuotaExcedidaError } from "@/lib/limites/erros";
import {
  consumirCota,
  estornarCota,
  listarUsoDiario,
  obterUsoDiario,
  reservarCota,
  verificarCota,
} from "@/lib/limites/servico";

const userId = "user-1";
const hoje = dataHojeBr();

/** Erro de unique do Prisma como ele chega no `catch`: só o `code` importa. */
const erroP2002 = Object.assign(new Error("Unique constraint failed"), {
  code: "P2002",
});

describe("limites diários (F018)", () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.mocked(obterModoChave).mockResolvedValue("orion");
  });

  it("obterUsoDiario retorna zero quando não há registro", async () => {
    prismaMock.dailyUsage.findUnique.mockResolvedValue(null);
    const uso = await obterUsoDiario(userId, "coleta");
    expect(uso).toEqual({ operacao: "coleta", usado: 0, limite: 5, restante: 5 });
  });

  it("reservarCota incrementa com o teto no WHERE, não numa leitura anterior", async () => {
    prismaMock.dailyUsage.updateManyAndReturn.mockResolvedValue([
      { contador: 3 },
    ]);

    const uso = await reservarCota(userId, "coleta");

    expect(uso.usado).toBe(3);
    expect(uso.restante).toBe(2);
    // O `contador: { lt: limite }` é o que segura o teto sob concorrência:
    // sem ele, duas requisições simultâneas passariam as duas (ADR-017).
    expect(prismaMock.dailyUsage.updateManyAndReturn).toHaveBeenCalledWith({
      where: {
        user_id: userId,
        data: hoje,
        operacao: "coleta",
        contador: { lt: 5 },
      },
      data: { contador: { increment: 1 } },
      select: { contador: true },
    });
    // Nenhuma leitura do contador antes de decidir.
    expect(prismaMock.dailyUsage.findUnique).not.toHaveBeenCalled();
  });

  it("reservarCota cria o registro na primeira operação do dia", async () => {
    prismaMock.dailyUsage.updateManyAndReturn.mockResolvedValue([]);
    prismaMock.dailyUsage.findUnique.mockResolvedValue(null);
    prismaMock.dailyUsage.create.mockResolvedValue({ contador: 1 });

    const uso = await reservarCota(userId, "coleta");

    expect(uso.usado).toBe(1);
    expect(uso.restante).toBe(4);
  });

  it("reservarCota lança quando o teto já foi atingido", async () => {
    prismaMock.dailyUsage.updateManyAndReturn.mockResolvedValue([]);
    prismaMock.dailyUsage.findUnique.mockResolvedValue({ contador: 5 });

    await expect(reservarCota(userId, "coleta")).rejects.toBeInstanceOf(
      QuotaExcedidaError,
    );
    // Acima do teto não tenta INSERT: o unique violado poluiria o log do
    // Postgres a cada tentativa do aluno.
    expect(prismaMock.dailyUsage.create).not.toHaveBeenCalled();
  });

  it("reservarCota sobrevive à corrida da primeira operação do dia", async () => {
    // O lote paralelo da F025 cai aqui toda manhã: N requisições veem a linha
    // ausente e todas tentam criar. Só uma ganha; as outras incrementam.
    prismaMock.dailyUsage.updateManyAndReturn
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ contador: 2 }]);
    prismaMock.dailyUsage.findUnique.mockResolvedValue(null);
    prismaMock.dailyUsage.create.mockRejectedValue(erroP2002);

    const uso = await reservarCota(userId, "diagnostico");

    expect(uso.usado).toBe(2);
    expect(prismaMock.dailyUsage.updateManyAndReturn).toHaveBeenCalledTimes(2);
  });

  it("reservarCota não engole erro de banco que não seja unique", async () => {
    prismaMock.dailyUsage.updateManyAndReturn.mockResolvedValue([]);
    prismaMock.dailyUsage.findUnique.mockResolvedValue(null);
    prismaMock.dailyUsage.create.mockRejectedValue(new Error("conexão caiu"));

    await expect(reservarCota(userId, "coleta")).rejects.toThrow("conexão caiu");
  });

  it("estornarCota devolve 1 com o piso no WHERE", async () => {
    prismaMock.dailyUsage.updateMany.mockResolvedValue({ count: 1 });

    await estornarCota(userId, "simulador_msg");

    expect(prismaMock.dailyUsage.updateMany).toHaveBeenCalledWith({
      where: {
        user_id: userId,
        data: hoje,
        operacao: "simulador_msg",
        contador: { gt: 0 },
      },
      data: { contador: { decrement: 1 } },
    });
  });

  it("cotas não valem no modo BYOK — nem reserva, nem estorno", async () => {
    vi.mocked(obterModoChave).mockResolvedValue("byok");

    await expect(verificarCota(userId, "coleta")).resolves.toBeUndefined();
    await expect(estornarCota(userId, "coleta")).resolves.toBeUndefined();

    expect(prismaMock.dailyUsage.updateManyAndReturn).not.toHaveBeenCalled();
    expect(prismaMock.dailyUsage.updateMany).not.toHaveBeenCalled();
  });

  it("consumirCota (compat) só lê uso atual", async () => {
    prismaMock.dailyUsage.findUnique.mockResolvedValue({ contador: 2 });
    const uso = await consumirCota(userId, "simulador_msg");
    expect(uso.usado).toBe(2);
  });

  it("listarUsoDiario retorna todas as operações", async () => {
    prismaMock.dailyUsage.findMany.mockResolvedValue([
      { operacao: "coleta", contador: 2 },
      { operacao: "simulador_msg", contador: 10 },
    ]);
    const lista = await listarUsoDiario(userId);
    // Contra OPERACOES_COTA, não contra um número solto: adicionar uma
    // operação (F025 somou `diagnostico`) não deve quebrar este teste.
    expect(lista).toHaveLength(OPERACOES_COTA.length);
    const coleta = lista.find((u) => u.operacao === "coleta");
    expect(coleta?.usado).toBe(2);
    const agente = lista.find((u) => u.operacao === "agente_msg");
    expect(agente?.usado).toBe(0);
  });

  // 2026-08-16 — Proposta e Abordagem saíram da cota diária: as duas já têm
  // teto mensal por plano (F035), e 5/dia contra 150 Abordagens/mês fazia a
  // diária virar o limite de produto pra quem tinha pago pra não ser barrado.
  // Coleta e Diagnóstico ficam porque lá o mensal conta entrega, não consumo:
  // busca duplicada e re-diagnóstico gastam API cobrando zero de cota.
  it("só tem cota diária a operação que o teto mensal não limita", () => {
    expect(OPERACOES_COTA).not.toContain("proposta");
    expect(OPERACOES_COTA).not.toContain("abordagem");
    expect(OPERACOES_COTA).toContain("coleta");
    expect(OPERACOES_COTA).toContain("diagnostico");
  });
});

describe("dataHojeBr", () => {
  it("retorna Date válido", () => {
    const d = dataHojeBr();
    expect(d).toBeInstanceOf(Date);
    expect(Number.isNaN(d.getTime())).toBe(false);
  });
});
