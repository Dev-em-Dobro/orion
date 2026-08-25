// F019 — IDs Hubla que concedem acesso Orion.
// Elite (legado + novo) abre a porta e, no trial-pro-*, ganha cortesia Pro.
// PRO Club (`HUBLA_PRODUCT_ID_CLUB_PRO`) abre a porta no plano Free.
// `HUBLA_PRODUCT_ID_PRO` no Orion é o plano Pro da F035 — não entra aqui.

function collectIds(raws: Array<string | undefined>): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const raw of raws) {
    for (const part of (raw ?? "").split(",")) {
      const id = part.trim();
      if (!id || seen.has(id)) continue;
      seen.add(id);
      ids.push(id);
    }
  }
  return ids;
}

/** Legado R$ 997 + Elite novo — cortesia Pro (F035). */
export function idsProdutoEliteAcessoHubla(): string[] {
  return collectIds([
    process.env.HUBLA_PRODUCT_ID,
    process.env.HUBLA_PRODUCT_ID_ELITE,
  ]);
}

/** PRO Club R$ 297 — acesso Free, sem cortesia. */
export function idsProdutoClubProAcessoHubla(): string[] {
  return collectIds([process.env.HUBLA_PRODUCT_ID_CLUB_PRO]);
}

/** Toda a porta: Elite + PRO Club. */
export function idsProdutoAcessoHubla(): string[] {
  return collectIds([
    process.env.HUBLA_PRODUCT_ID,
    process.env.HUBLA_PRODUCT_ID_ELITE,
    process.env.HUBLA_PRODUCT_ID_CLUB_PRO,
  ]);
}
