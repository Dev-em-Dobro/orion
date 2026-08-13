// F032 — o filtro atual da lista, em um lugar só.
// Spec: /specs/02-features/F032-interface-do-orion.md
//
// Existe porque duas telas precisam do MESMO recorte: a lista `/leads` e a
// navegação ‹ › do detalhe, que percorre os Leads do filtro de origem (AC8).
// Se cada uma montasse o seu `where`, a ordem do "próximo" divergiria da ordem
// que o aluno está vendo.
//
// Puro: sem Next, sem Prisma em runtime (só o tipo).

import type { LeadStatus, Prisma } from "@prisma/client";
import {
  ESTAGIOS_FUNIL,
  ONDE_NAO_DESCARTADO,
  STATUS_DESCARTADO,
} from "@/lib/funil";
import { SCORE_QUALIFICADO } from "@/lib/score/score";
import { parseFiltroSite, whereFiltroSite, type FiltroSite } from "./filtroSite";

/** Score mínimo do chip "Score 60+" — o corte de Lead qualificado da F003. */
export const SCORE_CHIP = SCORE_QUALIFICADO;

export type FiltroLista = {
  categoria: string | null;
  site: FiltroSite | null;
  scoreMin: number | null;
  comTelefone: boolean;
  /** F026 — Leads sem sinal de atendimento automatizado no site. */
  semAtendimento: boolean;
  /** Estágio do funil, vindo do clique no gráfico do Dashboard. */
  estagio: LeadStatus | null;
  descartados: boolean;
};

export type ParamsLista = {
  categoria?: string;
  site?: string;
  score?: string;
  telefone?: string;
  atendimento?: string;
  /** Estágio do funil. Param próprio: `status` já significa "descartados". */
  estagio?: string;
  status?: string;
};

/** Só estágio do funil: `descartado` entra pelo `status=descartados`. */
function parseEstagio(raw: string | undefined): LeadStatus | null {
  const limpo = (raw ?? "").trim() as LeadStatus;
  return ESTAGIOS_FUNIL.includes(limpo) ? limpo : null;
}

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
    semAtendimento: params.atendimento === "nao",
    estagio: parseEstagio(params.estagio),
    descartados: params.status === "descartados",
  };
}

/** `true` quando algo além da visão padrão está aplicado. */
export function temFiltro(f: FiltroLista): boolean {
  return (
    f.categoria !== null ||
    f.site !== null ||
    f.scoreMin !== null ||
    f.comTelefone ||
    f.semAtendimento ||
    f.estagio !== null
  );
}

/** Cláusula Prisma do filtro — sem o escopo do tenant, que quem chama soma. */
export function whereFiltroLista(f: FiltroLista): Prisma.LeadWhereInput {
  return {
    ...(f.descartados ? { status: STATUS_DESCARTADO } : ONDE_NAO_DESCARTADO),
    // Depois do fragmento acima de propósito: o estágio escolhido vence a
    // visão padrão de "tudo menos descartado".
    ...(f.estagio ? { status: f.estagio } : {}),
    ...(f.categoria ? { categoria: f.categoria } : {}),
    ...(f.site ? whereFiltroSite(f.site) : {}),
    ...(f.scoreMin !== null ? { score: { gte: f.scoreMin } } : {}),
    // Telefone vazio existe na base (o Places nem sempre devolve o campo).
    ...(f.comTelefone
      ? { AND: [{ telefone: { not: null } }, { NOT: { telefone: "" } }] }
      : {}),
    // F026 — filtra pela **Dor**, não pelo campo do Diagnóstico. As Dores são
    // substituídas a cada novo Diagnóstico (`substituirDoresDoLead`), então
    // refletem sempre o último; um `some` sobre Diagnostico casaria com
    // qualquer diagnóstico antigo e daria resultado errado após re-diagnóstico.
    ...(f.semAtendimento
      ? { dores: { some: { tipo: "SEM_ATENDIMENTO_AUTOMATIZADO" as const } } }
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
  if (f.semAtendimento) p.set("atendimento", "nao");
  if (f.estagio) p.set("estagio", f.estagio);
  if (f.descartados) p.set("status", "descartados");
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  return p.toString();
}
