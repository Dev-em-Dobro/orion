// F009 — Detecção de "website que não é site próprio": agregador link-in-bio
// ou perfil de rede social usado como site.
// Spec (fonte única do mapa de plataformas):
//   /specs/02-features/F009-sinal-site-agregador.md
// Pura e offline (só casa o host da URL) — sem rede, sem lib, sem ADR.
// Promover/rebaixar uma plataforma é mudança de estratégia → editar a spec antes.

// Domínios registráveis (eTLD+1) de agregadores link-in-bio.
export const AGREGADORES = new Set<string>([
  "linktr.ee",
  "linktree.com",
  "beacons.ai",
  "bio.link",
  "linkin.bio",
  "campsite.bio",
  "taplink.cc",
  "taplink.at",
  "taplink.ws",
  "solo.to",
  "msha.ke",
  "lnk.bio",
  "znap.link",
  "many.link",
  "manylink.co",
  "shor.by",
  "linkpop.com",
  "allmylinks.com",
  "hoo.be",
  "tap.bio",
  "liinks.co",
  "about.me",
  "flow.page",
  "direct.me",
]);

// Perfis de rede social usados como "site" (escopo F009: Instagram + Facebook).
export const SOCIAIS = new Set<string>([
  "instagram.com",
  "instagr.am",
  "facebook.com",
  "fb.com",
  "fb.me",
]);

export type TipoAgregador = "agregador" | "social";

export type ClassificacaoWebsite =
  | { ehAgregador: false }
  | {
      ehAgregador: true;
      tipo: TipoAgregador;
      /** Domínio registrável que casou (ex.: "linktr.ee", "instagram.com"). */
      plataforma: string;
      /** A URL usa https:? (agregadores/social são https, mas confirmamos.) */
      temHttps: boolean;
    };

/** Casa `host` contra um set de domínios registráveis, cobrindo `www.` e
 *  subdomínios (ex.: "fulano.taplink.cc" casa "taplink.cc"). Devolve o
 *  domínio que casou ou `undefined`. */
function casarDominio(host: string, dominios: Set<string>): string | undefined {
  for (const d of dominios) {
    if (host === d || host.endsWith(`.${d}`)) return d;
  }
  return undefined;
}

/** Classifica o `website` do Lead. Aponta para agregador link-in-bio ou perfil
 *  social → não é site próprio. Qualquer outra coisa (ou URL inválida) →
 *  `{ ehAgregador: false }` (segue o fluxo normal do Diagnóstico). */
export function classificarWebsite(url: string): ClassificacaoWebsite {
  const bruto = url.trim();
  if (!bruto) return { ehAgregador: false };

  let parsed: URL;
  try {
    parsed = new URL(bruto);
  } catch {
    // Sem esquema (ex.: "instagram.com/fulano") — tenta de novo com https://.
    try {
      parsed = new URL(`https://${bruto}`);
    } catch {
      return { ehAgregador: false };
    }
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, "");
  const temHttps = parsed.protocol === "https:";

  const ag = casarDominio(host, AGREGADORES);
  if (ag) return { ehAgregador: true, tipo: "agregador", plataforma: ag, temHttps };

  const so = casarDominio(host, SOCIAIS);
  if (so) return { ehAgregador: true, tipo: "social", plataforma: so, temHttps };

  return { ehAgregador: false };
}
