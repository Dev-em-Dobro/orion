// F041 — TMB vendas → HublaEntitlement (acesso Orion / F019.1).

import { prisma } from "@/lib/db";
import {
  idempotencyKeyTmb,
  interpretarVendaTmb,
} from "./interpretar";
import type { AcaoTmb } from "./tipos";
import {
  concederCortesiaProSeElite,
  revogarCortesiaProSeSemAcesso,
} from "@/lib/planos/cortesia-pro";

async function jaProcessouIdempotency(key: string): Promise<boolean> {
  const row = await prisma.hublaWebhookDelivery.findUnique({
    where: { idempotency_key: key },
  });
  return row !== null;
}

async function registrarEntrega(
  idempotencyKey: string,
  eventType: string,
): Promise<void> {
  await prisma.hublaWebhookDelivery.create({
    data: {
      idempotency_key: idempotencyKey,
      event_type: eventType,
    },
  });
}

async function aplicarAcao(acao: AcaoTmb): Promise<void> {
  if (acao.acao === "ignorar") return;

  if (acao.acao === "conceder") {
    await prisma.hublaEntitlement.upsert({
      where: {
        email_product_id: {
          email: acao.email,
          product_id: acao.productId,
        },
      },
      create: {
        email: acao.email,
        product_id: acao.productId,
        status: "ativo",
        hubla_user_id: acao.lancamentoId
          ? `tmb:lancamento:${acao.lancamentoId}`
          : null,
        subscription_id: `tmb:${acao.pedido}`,
        granted_at: new Date(),
      },
      update: {
        status: "ativo",
        hubla_user_id: acao.lancamentoId
          ? `tmb:lancamento:${acao.lancamentoId}`
          : null,
        subscription_id: `tmb:${acao.pedido}`,
        revoked_at: null,
        granted_at: new Date(),
      },
    });
    await concederCortesiaProSeElite(acao.email);
    return;
  }

  await prisma.hublaEntitlement.upsert({
    where: {
      email_product_id: {
        email: acao.email,
        product_id: acao.productId,
      },
    },
    create: {
      email: acao.email,
      product_id: acao.productId,
      status: "revogado",
      subscription_id: `tmb:${acao.pedido}`,
      revoked_at: new Date(),
    },
    update: {
      status: "revogado",
      revoked_at: new Date(),
    },
  });
  await revogarCortesiaProSeSemAcesso(acao.email);
}

export async function processarWebhookTmb(
  payload: unknown,
): Promise<{ ignorado: boolean; motivo?: string; acao?: string }> {
  const acao = interpretarVendaTmb(payload);
  const key = idempotencyKeyTmb(acao, payload);
  const eventType =
    acao.acao === "ignorar"
      ? "tmb.ignore"
      : acao.acao === "conceder"
        ? "tmb.grant"
        : "tmb.revoke";

  if (await jaProcessouIdempotency(key)) {
    return { ignorado: true, motivo: "idempotency duplicada", acao: acao.acao };
  }

  if (acao.acao === "ignorar") {
    await registrarEntrega(key, eventType);
    return { ignorado: true, motivo: acao.motivo, acao: "ignorar" };
  }

  await aplicarAcao(acao);
  await registrarEntrega(key, eventType);
  return { ignorado: false, acao: acao.acao };
}
