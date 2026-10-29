// F019 — IDs Hubla que concedem acesso Orion.
// Elite (produto Club sem oferta PRO, ou oferta Elite) abre a porta e,
// no trial-pro-*, ganha cortesia Pro.
// Oferta PRO (`HUBLA_OFFER_ID_PRO`) abre a porta no plano Free.
// `HUBLA_PRODUCT_ID_PRO` no Orion é o plano Pro da F035 — não entra aqui.

/** Slugs oficiais = `offers[].id` no webhook (pay.hub.la/…). */
export const HUBLA_OFFER_IDS_PRO_OFICIAIS = [
  "XaY8QNfZlOO1XBgjzMfY",
  "drj7n2oUUYP5CBvzu7b7",
] as const;
export const HUBLA_OFFER_IDS_ELITE_OFICIAIS = [
  "v1SsMcVXNip7Mn5A2pNH",
  "SFykfBk80jkM1sAVJKxV",
  "1mGgy9MVD11CJdnsLEov",
  "cXqc4mz6YZFE4GKjGFUz",
] as const;
/** F042 — Black Infinita 2026: mesma cortesia Pro 90d do Elite (Club = vitalício). */
export const HUBLA_OFFER_IDS_BLACK_INFINITA_OFICIAIS = [
  "YKPMuMwSBhPBb7UUuDlX",
  "NZKc6aZXwbD4ihw9vvPN",
  "6njIGlJgossHQysj6WA7",
] as const;
/** Produto Hubla "DevQuest 2.0 - Black Friday" que hospeda as 3 ofertas. */
export const HUBLA_PRODUCT_ID_BLACK_FRIDAY = "hXQcK8O5fZGvRK4RVMxJ";

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
    HUBLA_PRODUCT_ID_BLACK_FRIDAY,
    process.env.HUBLA_PRODUCT_ID_BLACK_FRIDAY,
    // Hubla BF: event.product.id às vezes é o offer slug.
    ...HUBLA_OFFER_IDS_BLACK_INFINITA_OFICIAIS,
    process.env.HUBLA_OFFER_ID_BLACK_INFINITA,
  ]);
}

/** Ofertas PRO no produto Club — acesso Free, sem cortesia. */
export function idsOfertaProHubla(): string[] {
  return collectIds([...HUBLA_OFFER_IDS_PRO_OFICIAIS, process.env.HUBLA_OFFER_ID_PRO]);
}

/** Ofertas Elite no produto Club (público + alunos + Europa + Black Infinita). */
export function idsOfertaEliteHubla(): string[] {
  return collectIds([
    ...HUBLA_OFFER_IDS_ELITE_OFICIAIS,
    ...HUBLA_OFFER_IDS_BLACK_INFINITA_OFICIAIS,
    process.env.HUBLA_OFFER_ID_ELITE,
    process.env.HUBLA_OFFER_ID_BLACK_INFINITA,
  ]);
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
    HUBLA_PRODUCT_ID_BLACK_FRIDAY,
    process.env.HUBLA_PRODUCT_ID_BLACK_FRIDAY,
    ...HUBLA_OFFER_IDS_ELITE_OFICIAIS,
    ...HUBLA_OFFER_IDS_BLACK_INFINITA_OFICIAIS,
    process.env.HUBLA_OFFER_ID_ELITE,
    process.env.HUBLA_OFFER_ID_BLACK_INFINITA,
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
