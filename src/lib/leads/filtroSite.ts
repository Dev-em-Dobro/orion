// F001 / F009 — filtro da lista `/leads` por tipo de site (coluna Site).

import type { Prisma } from "@prisma/client";
import { AGREGADORES, SOCIAIS } from "@/lib/diagnostico/agregador";

export const FILTROS_SITE = [
  "sem_site",
  "site",
  "link_in_bio",
  "rede_social",
] as const;

export type FiltroSite = (typeof FILTROS_SITE)[number];

export const ROTULO_FILTRO_SITE: Record<FiltroSite, string> = {
  sem_site: "sem site",
  site: "site",
  link_in_bio: "link-in-bio",
  rede_social: "rede social",
};

export function parseFiltroSite(raw: string | undefined): FiltroSite | null {
  const v = raw?.trim() ?? "";
  return (FILTROS_SITE as readonly string[]).includes(v)
    ? (v as FiltroSite)
    : null;
}

function websiteContemDominios(
  dominios: Set<string>,
): Prisma.LeadWhereInput[] {
  return [...dominios].map((d) => ({
    website: { contains: d, mode: "insensitive" as const },
  }));
}

/** Cláusula Prisma alinhada à badge da coluna Site. */
export function whereFiltroSite(filtro: FiltroSite): Prisma.LeadWhereInput {
  const agregadorOuSocial = websiteContemDominios(
    new Set([...AGREGADORES, ...SOCIAIS]),
  );

  switch (filtro) {
    case "sem_site":
      return {
        OR: [{ website: null }, { website: "" }],
      };
    case "link_in_bio":
      return {
        AND: [
          { website: { not: null } },
          { NOT: { website: "" } },
          { OR: websiteContemDominios(AGREGADORES) },
        ],
      };
    case "rede_social":
      return {
        AND: [
          { website: { not: null } },
          { NOT: { website: "" } },
          { OR: websiteContemDominios(SOCIAIS) },
        ],
      };
    case "site":
      return {
        AND: [
          { website: { not: null } },
          { NOT: { website: "" } },
          { NOT: { OR: agregadorOuSocial } },
        ],
      };
  }
}
