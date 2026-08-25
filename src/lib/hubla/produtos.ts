// F019 — IDs Hubla que concedem acesso Orion.
// Elite (produto Club sem oferta PRO, ou oferta Elite) abre a porta e,
// no trial-pro-*, ganha cortesia Pro.
// Oferta PRO (`HUBLA_OFFER_ID_PRO`) abre a porta no plano Free.
// `HUBLA_PRODUCT_ID_PRO` no Orion é o plano Pro da F035 — não entra aqui.

function collectIds(raws: Array<string | undefined | readonly string[]>): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    const parts: readonly string[] =
      raw == null ? [] : typeof raw === "string" ? raw.split(",") : raw;
    for (const part of parts) {
      const id = part.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** Product.ids aceitos no webhook (não inclui offer ids). */
export function idsProdutoAcessoHubla(): string[] {
  return collectIds([
    process.env.HUBLA_PRODUCT_ID,
    process.env.HUBLA_PRODUCT_ID_ELITE,
    process.env.HUBLA_PRODUCT_ID_CLUB_PRO,
  ]);
}

/** Ofertas PRO no produto Club — acesso Free, sem cortesia. */
export function idsOfertaProHubla(): string[] {
  return collectIds([process.env.HUBLA_OFFER_ID_PRO]);
}

/** Ofertas Elite no produto Club. */
export function idsOfertaEliteHubla(): string[] {
  return collectIds([process.env.HUBLA_OFFER_ID_ELITE]);
}

/** Produto PRO separado — só se a Hubla criar um. */
export function idsProdutoClubProAcessoHubla(): string[] {
  return collectIds([process.env.HUBLA_PRODUCT_ID_CLUB_PRO]);
}

/**
 * Chaves gravadas em HublaEntitlement que contam como Elite (cortesia).
 * Offer PRO fica de fora de propósito: PRO e Elite compartilham product.id.
 */
export function idsProdutoEliteAcessoHubla(): string[] {
  return collectIds([
    process.env.HUBLA_PRODUCT_ID,
    process.env.HUBLA_PRODUCT_ID_ELITE,
    process.env.HUBLA_OFFER_ID_ELITE,
  ]);
}

/** Chaves de entitlement que abrem a porta (produto + ofertas). */
export function idsChaveAcessoHubla(): string[] {
  return collectIds([
    ...idsProdutoAcessoHubla(),
    ...idsOfertaProHubla(),
    ...idsOfertaEliteHubla(),
  ]);
}
