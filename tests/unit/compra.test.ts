import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    hublaEntitlement: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import {
  CompraNaoEncontradaError,
  CompraRequiredError,
  requireCompraAtiva,
  statusCompra,
  tentarAutoVerificar,
  verificarCompraManual,
} from "@/lib/compra";

const USER_ID = "user-1";

describe("compra F019.1", () => {
  beforeEach(() => {
    process.env.HUBLA_PRODUCT_ID = "VL3e0iDO3A32SyjJWr9S";
  });

  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.HUBLA_PRODUCT_ID;
  });

  it("auto-verifica com e-mail de login", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: "aluno@email.com",
      purchaseEmail: null,
      purchaseVerifiedAt: null,
      purchaseProductId: null,
    });
    prismaMock.hublaEntitlement.findFirst.mockResolvedValue({ status: "ativo" });
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({});

    const ok = await tentarAutoVerificar(USER_ID);
    expect(ok).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: USER_ID },
        data: expect.objectContaining({
          purchaseEmail: "aluno@email.com",
          purchaseProductId: "VL3e0iDO3A32SyjJWr9S",
        }),
      }),
    );
  });

  it("verificarCompraManual falha sem entitlement", async () => {
    prismaMock.hublaEntitlement.findFirst.mockResolvedValue(null);

    await expect(
      verificarCompraManual(USER_ID, "nao-comprou@email.com"),
    ).rejects.toBeInstanceOf(CompraNaoEncontradaError);
  });

  it("verificarCompraManual grava cache quando ativo", async () => {
    prismaMock.hublaEntitlement.findFirst.mockResolvedValue({ status: "ativo" });
    prismaMock.user.findFirst.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({});

    const res = await verificarCompraManual(USER_ID, "Comprador@Hubla.com");
    expect(res.email).toBe("comprador@hubla.com");
    expect(prismaMock.user.update).toHaveBeenCalled();
  });

  it("statusCompra usa cache quando entitlement ainda ativo", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: "a@b.com",
      purchaseEmail: "compra@c.com",
      purchaseVerifiedAt: new Date("2026-01-01"),
      purchaseProductId: "VL3e0iDO3A32SyjJWr9S",
    });
    prismaMock.hublaEntitlement.findFirst.mockResolvedValue({ status: "ativo" });

    const status = await statusCompra(USER_ID);
    expect(status.verificada).toBe(true);
    expect(status.purchaseEmail).toBe("compra@c.com");
  });

  it("statusCompra limpa cache se entitlement revogado", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: "a@b.com",
      purchaseEmail: "compra@c.com",
      purchaseVerifiedAt: new Date("2026-01-01"),
      purchaseProductId: "VL3e0iDO3A32SyjJWr9S",
    });
    prismaMock.hublaEntitlement.findFirst.mockResolvedValue(null);
    prismaMock.user.update.mockResolvedValue({});

    const status = await statusCompra(USER_ID);
    expect(status.verificada).toBe(false);
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          purchaseEmail: null,
          purchaseVerifiedAt: null,
          purchaseProductId: null,
        },
      }),
    );
  });

  it("requireCompraAtiva lança quando pendente", async () => {
    prismaMock.user.findUnique.mockResolvedValue({
      id: USER_ID,
      email: "a@b.com",
      purchaseEmail: null,
      purchaseVerifiedAt: null,
      purchaseProductId: null,
    });
    prismaMock.hublaEntitlement.findFirst.mockResolvedValue(null);

    await expect(requireCompraAtiva(USER_ID)).rejects.toBeInstanceOf(
      CompraRequiredError,
    );
  });
});
