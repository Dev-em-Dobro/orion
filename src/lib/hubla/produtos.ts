// F019 — IDs Hubla que concedem acesso Orion (Elite do Club, não PRO).
// `HUBLA_PRODUCT_ID_PRO` no Orion é o plano Pro da F035 — não entra aqui.

export function idsProdutoAcessoHubla(): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const raw of [
    process.env.HUBLA_PRODUCT_ID,
    process.env.HUBLA_PRODUCT_ID_ELITE,
  ]) {
    const id = raw?.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}
