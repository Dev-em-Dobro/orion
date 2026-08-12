import { describe, expect, it, vi, afterEach } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    hublaWebhookDelivery: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    hublaEntitlement: {
      upsert: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

import { interpretarEventoHubla } from "@/lib/hubla/interpretar";
import { normalizarEmailHubla } from "@/lib/hubla/normalizar";
import { processarWebhookHubla } from "@/lib/hubla/repositorio";

describe("hubla interpretar", () => {
  it("member_added concede acesso", () => {
    const acao = interpretarEventoHubla(
      {
        type: "customer.member_added",
        event: {
          product: { id: "prod-1" },
          user: { email: "Aluno@Email.com", id: "u1" },
          subscription: { id: "sub-1", status: "active" },
        },
      },
      "prod-1",
    );
    expect(acao).toEqual({
      acao: "conceder",
      email: "aluno@email.com",
      productId: "prod-1",
      hublaUserId: "u1",
      subscriptionId: "sub-1",
    });
  });

  it("member_removed revoga", () => {
    const acao = interpretarEventoHubla(
      {
        type: "customer.member_removed",
        event: {
          product: { id: "prod-1" },
          user: { email: "a@b.com" },
        },
      },
      null,
    );
    expect(acao).toEqual({
      acao: "revogar",
      email: "a@b.com",
      productId: "prod-1",
    });
  });

  it("ignora produto fora do filtro", () => {
    const acao = interpretarEventoHubla(
      {
        type: "customer.member_added",
        event: {
          product: { id: "outro" },
          user: { email: "a@b.com" },
          subscription: { status: "active" },
        },
      },
      "prod-esperado",
    );
    expect(acao.acao).toBe("ignorar");
  });

  it("sandbox Builders Club (payload real Hubla)", () => {
    const acao = interpretarEventoHubla(
      {
        type: "customer.member_added",
        version: "2.0.0",
        event: {
          product: {
            id: "VL3e0iDO3A32SyjJWr9S",
            name: "Builders Club",
          },
          products: [
            {
              id: "VL3e0iDO3A32SyjJWr9S",
              name: "Builders Club",
            },
          ],
          subscription: {
            id: "01cc18cb-5297-41a4-8410-9058c7113aab-tester",
            type: "one_time",
            status: "active",
            payer: {
              email: "test-payer-email@example.com",
            },
          },
          user: {
            id: "RE4gy1p6uehKiXh4Ul4Jk-tester",
            email: "test-payer-email@example.com",
          },
        },
      },
      "VL3e0iDO3A32SyjJWr9S",
    );
    expect(acao).toEqual({
      acao: "conceder",
      email: "test-payer-email@example.com",
      productId: "VL3e0iDO3A32SyjJWr9S",
      hublaUserId: "RE4gy1p6uehKiXh4Ul4Jk-tester",
      subscriptionId: "01cc18cb-5297-41a4-8410-9058c7113aab-tester",
    });
  });
});

describe("hubla processarWebhookHubla", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("persiste entitlement em member_added", async () => {
    prismaMock.hublaWebhookDelivery.findUnique.mockResolvedValue(null);
    prismaMock.hublaEntitlement.upsert.mockResolvedValue({});

    const res = await processarWebhookHubla(
      {
        type: "customer.member_added",
        event: {
          product: { id: "p1" },
          user: { email: "x@y.com" },
          subscription: { status: "active" },
        },
      },
      { eventType: "customer.member_added", idempotencyKey: "idem-1" },
    );

    expect(res.ignorado).toBe(false);
    expect(prismaMock.hublaEntitlement.upsert).toHaveBeenCalled();
    expect(prismaMock.hublaWebhookDelivery.create).toHaveBeenCalledWith({
      data: {
        idempotency_key: "idem-1",
        event_type: "customer.member_added",
      },
    });
  });

  it("pula idempotency duplicada", async () => {
    prismaMock.hublaWebhookDelivery.findUnique.mockResolvedValue({
      idempotency_key: "idem-1",
    });

    const res = await processarWebhookHubla(
      { type: "customer.member_added" },
      { eventType: "customer.member_added", idempotencyKey: "idem-1" },
    );

    expect(res.ignorado).toBe(true);
    expect(prismaMock.hublaEntitlement.upsert).not.toHaveBeenCalled();
  });
});

describe("normalizarEmailHubla", () => {
  it("lowercase e trim", () => {
    expect(normalizarEmailHubla("  Foo@Bar.COM ")).toBe("foo@bar.com");
  });
});
