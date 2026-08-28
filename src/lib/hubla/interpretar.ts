// Interpreta payload Hubla → ação de entitlement (puro, testável).

import { emailDoEvento, offerIdsDoEvento, productIdDoEvento } from "./normalizar";
import {
  EVENTOS_CONCEDER,
  EVENTOS_REVOGAR,
  type AcaoEntitlement,
  type HublaWebhookPayload,
} from "./tipos";

export type FiltroAcessoHubla = {
  productIds: readonly string[];
  offerIdsPro?: readonly string[];
  offerIdsElite?: readonly string[];
  eliteProductIds?: readonly string[];
  clubProProductIds?: readonly string[];
};

export type ProductIdFiltroHubla =
  | string
  | readonly string[]
  | FiltroAcessoHubla
  | null
  | undefined;

function setIds(raws: readonly string[] | undefined): Set<string> {
  const set = new Set<string>();
  for (const raw of raws ?? []) {
    const id = raw.trim();
    if (id) set.add(id);
  }
  return set;
}

function isFiltroAcesso(filtro: ProductIdFiltroHubla): filtro is FiltroAcessoHubla {
  return (
    typeof filtro === "object" &&
    filtro !== null &&
    !Array.isArray(filtro) &&
    "productIds" in filtro
  );
}

function allowlistProduto(filtro: ProductIdFiltroHubla): Set<string> | null {
  if (filtro == null || filtro === "") return null;
  if (isFiltroAcesso(filtro)) {
    const ids = [...filtro.productIds].map((id) => id.trim()).filter(Boolean);
    return ids.length > 0 ? new Set(ids) : null;
  }
  const ids = (typeof filtro === "string" ? [filtro] : [...filtro])
    .map((id) => id.trim())
    .filter(Boolean);
  return new Set(ids);
}

function ofertaProDoEvento(
  offerIds: string[],
  pro: Set<string>,
): string | null {
  for (const id of offerIds) {
    if (pro.has(id)) return id;
  }
  return null;
}

function ofertaEliteDoEvento(
  offerIds: string[],
  elite: Set<string>,
): string | null {
  for (const id of offerIds) {
    if (elite.has(id)) return id;
  }
  return null;
}

/**
 * PRO no mesmo produto Club grava a offer id (não o product.id compartilhado),
 * senão a cortesia Elite não consegue distinguir os dois.
 */
function classificarGrant(opts: {
  productId: string;
  offerIds: string[];
  filtro: ProductIdFiltroHubla;
}): { chaveEntitlement: string; cortesiaPro: boolean } {
  const offerIdsPro = isFiltroAcesso(opts.filtro)
    ? setIds(opts.filtro.offerIdsPro)
    : new Set<string>();
  const offerIdsElite = isFiltroAcesso(opts.filtro)
    ? setIds(opts.filtro.offerIdsElite)
    : new Set<string>();
  const eliteProducts = isFiltroAcesso(opts.filtro)
    ? setIds(opts.filtro.eliteProductIds)
    : new Set<string>();
  const clubProProducts = isFiltroAcesso(opts.filtro)
    ? setIds(opts.filtro.clubProProductIds)
    : new Set<string>();

  const ofertaPro = ofertaProDoEvento(opts.offerIds, offerIdsPro);
  const ofertaElite = ofertaEliteDoEvento(opts.offerIds, offerIdsElite);

  if (ofertaPro) {
    return { chaveEntitlement: ofertaPro, cortesiaPro: false };
  }
  if (ofertaElite) {
    return { chaveEntitlement: opts.productId, cortesiaPro: true };
  }
  // Com offers[] no payload: nunca cortesia só pelo product.id compartilhado.
  if (opts.offerIds.length > 0) {
    return {
      chaveEntitlement: opts.offerIds[0]!,
      cortesiaPro: false,
    };
  }
  if (clubProProducts.has(opts.productId)) {
    return { chaveEntitlement: opts.productId, cortesiaPro: false };
  }
  if (eliteProducts.has(opts.productId)) {
    return { chaveEntitlement: opts.productId, cortesiaPro: true };
  }
  return { chaveEntitlement: opts.productId, cortesiaPro: false };
}

function chavesRevogar(
  productId: string,
  offerIds: string[],
  filtro: ProductIdFiltroHubla,
): string[] {
  const ids: string[] = [productId, ...offerIds];
  const seen = new Set(ids);
  const extra = isFiltroAcesso(filtro)
    ? [
        ...(filtro.offerIdsPro ?? []),
        ...(filtro.offerIdsElite ?? []),
        ...(filtro.clubProProductIds ?? []),
      ]
    : [];
  for (const raw of extra) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
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

  const offerIds = offerIdsDoEvento(event);

  if (EVENTOS_CONCEDER.has(tipo)) {
    const subStatus = event.subscription?.status?.toLowerCase();
    if (subStatus && subStatus !== "active") {
      return { acao: "ignorar", motivo: "subscription não active" };
    }
    const grant = classificarGrant({ productId, offerIds, filtro: productIdFiltro });
    return {
      acao: "conceder",
      email,
      productId,
      chaveEntitlement: grant.chaveEntitlement,
      cortesiaPro: grant.cortesiaPro,
      hublaUserId: event.user?.id,
      subscriptionId: event.subscription?.id,
    };
  }

  if (EVENTOS_REVOGAR.has(tipo)) {
    return {
      acao: "revogar",
      email,
      productId,
      chavesEntitlement: chavesRevogar(productId, offerIds, productIdFiltro),
    };
  }

  return { acao: "ignorar", motivo: `tipo não tratado: ${tipo}` };
}
