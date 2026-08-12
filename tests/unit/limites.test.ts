import { afterEach, describe, expect, it, vi } from "vitest";

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
    },
    $transaction: vi.fn(),
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
  listarUsoDiario,
  obterUsoDiario,
  verificarCota,
} from "@/lib/limites/servico";

const userId = "user-1";
const hoje = dataHojeBr();

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

  it("verificarCota lança quando no limite", async () => {
    prismaMock.dailyUsage.findUnique.mockResolvedValue({
      contador: 5,
    });
    await expect(verificarCota(userId, "coleta")).rejects.toBeInstanceOf(
      QuotaExcedidaError,
    );
  });

  it("verificarCota ignora no modo BYOK", async () => {
    vi.mocked(obterModoChave).mockResolvedValue("byok");
    await expect(verificarCota(userId, "coleta")).resolves.toBeUndefined();
    expect(prismaMock.dailyUsage.findUnique).not.toHaveBeenCalled();
  });

  it("consumirCota cria registro na primeira vez", async () => {
    prismaMock.$transaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        dailyUsage: {
          findUnique: vi.fn().mockResolvedValue(null),
          create: vi.fn().mockResolvedValue({ contador: 1 }),
        },
      };
      return fn(tx);
    });
    const uso = await consumirCota(userId, "outreach");
    expect(uso.usado).toBe(1);
    expect(uso.restante).toBe(4);
  });

  it("listarUsoDiario retorna todas as operações", async () => {
    prismaMock.dailyUsage.findMany.mockResolvedValue([
      { operacao: "coleta", contador: 2 },
      { operacao: "simulador_msg", contador: 10 },
    ]);
    const lista = await listarUsoDiario(userId);
    expect(lista).toHaveLength(4);
    const coleta = lista.find((u) => u.operacao === "coleta");
    expect(coleta?.usado).toBe(2);
    const proposta = lista.find((u) => u.operacao === "proposta");
    expect(proposta?.usado).toBe(0);
  });
});

describe("dataHojeBr", () => {
  it("retorna Date válido", () => {
    const d = dataHojeBr();
    expect(d).toBeInstanceOf(Date);
    expect(Number.isNaN(d.getTime())).toBe(false);
  });
});
