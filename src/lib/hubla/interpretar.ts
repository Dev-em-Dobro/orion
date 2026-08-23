// Interpreta payload Hubla → ação de entitlement (puro, testável).

import { emailDoEvento, productIdDoEvento } from "./normalizar";
import {
  EVENTOS_CONCEDER,
  EVENTOS_REVOGAR,
  type AcaoEntitlement,
  type HublaWebhookPayload,
} from "./tipos";

export type ProductIdFiltroHubla = string | readonly string[] | null | undefined;

function allowlistProduto(
  filtro: ProductIdFiltroHubla,
): Set<string> | null {
  if (filtro == null || filtro === "") return null;
  const ids = (typeof filtro === "string" ? [filtro] : [...filtro])
    .map((id) => id.trim())
    .filter(Boolean);
  return new Set(ids);
}

export function interpretarEventoHubla(
  payload: HublaWebhookPayload,
  productIdFiltro?: ProductIdFiltroHubla,
): AcaoEntitlement {
  const tipo = payload.type?.trim();
  if (!tipo) {
    return { acao: "ignorar", motivo: "tipo ausente" };
  }

  const event = payload.event;
  if (!event) {
    return { acao: "ignorar", motivo: "event ausente" };
  }

  const productId = productIdDoEvento(event);
  if (!productId) {
    return { acao: "ignorar", motivo: "product_id ausente" };
  }

  const allow = allowlistProduto(productIdFiltro);
  if (allow && !allow.has(productId)) {
    return { acao: "ignorar", motivo: "produto não filtrado" };
  }

  const email = emailDoEvento(event);
  if (!email) {
    return { acao: "ignorar", motivo: "email ausente" };
  }

  if (EVENTOS_CONCEDER.has(tipo)) {
    const subStatus = event.subscription?.status?.toLowerCase();
    if (subStatus && subStatus !== "active") {
      return { acao: "ignorar", motivo: "subscription não active" };
    }
    return {
      acao: "conceder",
      email,
      productId,
      hublaUserId: event.user?.id,
      subscriptionId: event.subscription?.id,
    };
  }

  if (EVENTOS_REVOGAR.has(tipo)) {
    return { acao: "revogar", email, productId };
  }

  return { acao: "ignorar", motivo: `tipo não tratado: ${tipo}` };
}
