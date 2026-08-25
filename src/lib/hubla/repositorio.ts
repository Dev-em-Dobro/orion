// Persistência de entitlements Hubla (F019).

import { prisma } from "@/lib/db";
import {
  interpretarEventoHubla,
  type ProductIdFiltroHubla,
} from "./interpretar";
import type { AcaoEntitlement, HublaWebhookPayload } from "./tipos";
import {
  concederCortesiaPro,
  revogarCortesiaProSeSemAcesso,
} from "@/lib/planos/cortesia-pro";

export async function jaProcessouIdempotency(key: string): Promise<boolean> {
  const row = await prisma.hublaWebhookDelivery.findUnique({
    where: { idempotency_key: key },
  });
  return row !== null;
}

export async function registrarEntrega(
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

async function upsertEntitlement(opts: {
  email: string;
  productId: string;
  status: "ativo" | "revogado";
  hublaUserId?: string | null;
  subscriptionId?: string | null;
}): Promise<void> {
  const agora = new Date();
  if (opts.status === "ativo") {
    await prisma.hublaEntitlement.upsert({
      where: {
        email_product_id: {
          email: opts.email,
          product_id: opts.productId,
        },
      },
      create: {
        email: opts.email,
        product_id: opts.productId,
        status: "ativo",
        hubla_user_id: opts.hublaUserId ?? null,
        subscription_id: opts.subscriptionId ?? null,
        granted_at: agora,
      },
      update: {
        status: "ativo",
        hubla_user_id: opts.hublaUserId ?? null,
        subscription_id: opts.subscriptionId ?? null,
        revoked_at: null,
        granted_at: agora,
      },
    });
    return;
  }

  await prisma.hublaEntitlement.upsert({
    where: {
      email_product_id: {
        email: opts.email,
        product_id: opts.productId,
      },
    },
    create: {
      email: opts.email,
      product_id: opts.productId,
      status: "revogado",
      revoked_at: agora,
    },
    update: {
      status: "revogado",
      revoked_at: agora,
    },
  });
}

export async function aplicarAcaoEntitlement(acao: AcaoEntitlement): Promise<void> {
  if (acao.acao === "ignorar") return;

  if (acao.acao === "conceder") {
    await upsertEntitlement({
      email: acao.email,
      productId: acao.chaveEntitlement,
      status: "ativo",
      hublaUserId: acao.hublaUserId,
      subscriptionId: acao.subscriptionId,
    });
    if (acao.cortesiaPro) {
      await concederCortesiaPro(acao.email);
    }
    return;
  }

  for (const productId of acao.chavesEntitlement) {
    await upsertEntitlement({
      email: acao.email,
      productId,
      status: "revogado",
    });
  }
  await revogarCortesiaProSeSemAcesso(acao.email);
}

export async function processarWebhookHubla(
  payload: unknown,
  opts: {
    productIdFiltro?: ProductIdFiltroHubla;
    idempotencyKey?: string | null;
    eventType: string;
  },
): Promise<{ ignorado: boolean; motivo?: string }> {
  if (opts.idempotencyKey) {
    if (await jaProcessouIdempotency(opts.idempotencyKey)) {
      return { ignorado: true, motivo: "idempotency duplicada" };
    }
  }

  const acao = interpretarEventoHubla(payload as HublaWebhookPayload, opts.productIdFiltro);

  if (acao.acao === "ignorar") {
    if (opts.idempotencyKey) {
      await registrarEntrega(opts.idempotencyKey, opts.eventType);
    }
    return { ignorado: true, motivo: acao.motivo };
  }

  await aplicarAcaoEntitlement(acao);

  if (opts.idempotencyKey) {
    await registrarEntrega(opts.idempotencyKey, opts.eventType);
  }

  return { ignorado: false };
}

/** Consulta entitlement ativo por e-mail (para F019.1). */
export async function temEntitlementAtivo(
  email: string,
  productId?: string | null | readonly string[],
): Promise<boolean> {
  const normalizado = email.trim().toLowerCase();
  // `typeof` e não `Array.isArray`: com `string | readonly string[]` o false
  // branch do `Array.isArray` não elimina o array readonly no TS estrito —
  // e o build de prod cai em `productId.trim()`.
  const ids =
    productId == null
      ? null
      : typeof productId === "string"
        ? [productId.trim()].filter(Boolean)
        : productId.map((id) => id.trim()).filter(Boolean);

  const row = await prisma.hublaEntitlement.findFirst({
    where: {
      email: normalizado,
      status: "ativo",
      ...(ids && ids.length > 0 ? { product_id: { in: ids } } : {}),
    },
  });
  return row !== null;
}
