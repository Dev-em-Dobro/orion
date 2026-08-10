// F032 — o filtro atual da lista, em um lugar só.
// Spec: /specs/02-features/F032-interface-do-orion.md
//
// Existe porque duas telas precisam do MESMO recorte: a lista `/leads` e a
// navegação ‹ › do detalhe, que percorre os Leads do filtro de origem (AC8).
// Se cada uma montasse o seu `where`, a ordem do "próximo" divergiria da ordem
// que o aluno está vendo.
//
// Puro: sem Next, sem Prisma em runtime (só o tipo).

import type { Prisma } from "@prisma/client";
import { ONDE_NAO_DESCARTADO, STATUS_DESCARTADO } from "@/lib/funil";
import { parseFiltroSite, whereFiltroSite, type FiltroSite } from "./filtroSite";

/** Score mínimo do chip "Score 60+" — alinhado ao SCORE_QUALIFICADO da F003. */
export const SCORE_CHIP = 60;

export type FiltroLista = {
  categoria: string | null;
  site: FiltroSite | null;
  scoreMin: number | null;
  comTelefone: boolean;
  descartados: boolean;
};

export type ParamsLista = {
  categoria?: string;
  site?: string;
  score?: string;
  telefone?: string;
  status?: string;
};

export function parseFiltroLista(params: ParamsLista): FiltroLista {
  const scoreBruto = Number.parseInt(params.score ?? "", 10);
  return {
    categoria: (params.categoria?.trim() ?? "").slice(0, 80) || null,
    site: parseFiltroSite(params.site),
    scoreMin:
      Number.isFinite(scoreBruto) && scoreBruto > 0 && scoreBruto <= 100
        ? scoreBruto
        : null,
    comTelefone: params.telefone === "1",
    descartados: params.status === "descartados",
  };
}

/** `true` quando algo além da visão padrão está aplicado. */
export function temFiltro(f: FiltroLista): boolean {
  return (
    f.categoria !== null ||
    f.site !== null ||
    f.scoreMin !== null ||
    f.comTelefone
  );
}

/** Cláusula Prisma do filtro — sem o escopo do tenant, que quem chama soma. */
export function whereFiltroLista(f: FiltroLista): Prisma.LeadWhereInput {
  return {
    ...(f.descartados ? { status: STATUS_DESCARTADO } : ONDE_NAO_DESCARTADO),
    ...(f.categoria ? { categoria: f.categoria } : {}),
    ...(f.site ? whereFiltroSite(f.site) : {}),
    ...(f.scoreMin !== null ? { score: { gte: f.scoreMin } } : {}),
    // Telefone vazio existe na base (o Places nem sempre devolve o campo).
    ...(f.comTelefone
      ? { AND: [{ telefone: { not: null } }, { NOT: { telefone: "" } }] }
      : {}),
  };
}

/** Querystring que preserva o filtro ao navegar (detalhe, paginação, abas). */
export function queryDoFiltro(
  f: FiltroLista,
  extra: Record<string, string | number | undefined> = {},
): string {
  const p = new URLSearchParams();
  if (f.categoria) p.set("categoria", f.categoria);
  if (f.site) p.set("site", f.site);
  if (f.scoreMin !== null) p.set("score", String(f.scoreMin));
  if (f.comTelefone) p.set("telefone", "1");
  if (f.descartados) p.set("status", "descartados");
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  return p.toString();
}
