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
  COLUNA_POR_ID,
  ESTAGIOS_EM_ABERTO,
  ESTAGIOS_FUNIL,
  ONDE_NAO_DESCARTADO,
  ROTULO_ESTAGIO,
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
  /**
   * Recorte do funil, vindo do clique no gráfico do Dashboard.
   *
   * F010 (revisão 2026-08-13): era um `LeadStatus` só. Virou conjunto porque o
   * Dashboard passou a desenhar as **colunas** do kanban, e "Prontos" é
   * `priorizado` + `enriquecido` — com um status só o clique mostraria menos
   * Leads do que o número na barra.
   */
  estagio: RecorteEstagio | null;
  descartados: boolean;
};

export type RecorteEstagio = {
  /** O que vai (e volta) na URL: id de coluna ou nome de status. */
  token: string;
  /** Status que o recorte cobre. */
  status: LeadStatus[];
  /** Rótulo do chip — título da coluna ou do estágio. */
  rotulo: string;
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

/**
 * F010 (emenda b, 2026-08-13) — recortes que **não** são coluna do kanban.
 *
 * "Em aberto" atravessa quatro colunas (`contatado` → `proposta`), então não
 * tinha token: o card do Dashboard mostrava o número e não abria nada. Os
 * status saem de `ESTAGIOS_EM_ABERTO`, a mesma constante que o card soma —
 * número e filtro não têm como divergir.
 */
export const TOKEN_EM_ABERTO = "em-aberto";

const RECORTES_EXTRAS: Record<
  string,
  { status: LeadStatus[]; rotulo: string }
> = {
  [TOKEN_EM_ABERTO]: { status: ESTAGIOS_EM_ABERTO, rotulo: "Em aberto" },
};

/**
 * Aceita **id de coluna** do funil (`prontos`, `abordados`, …), um recorte
 * extra (`em-aberto`) ou um status solto. `descartado` fica de fora: entra pelo
 * `status=descartados`.
 *
 * Os formatos convivem porque o link do Dashboard passou a usar coluna, mas URL
 * antiga com `?estagio=priorizado` (favorito, histórico, link colado num grupo)
 * tem que continuar filtrando o que sempre filtrou.
 */
function parseEstagio(raw: string | undefined): RecorteEstagio | null {
  const limpo = (raw ?? "").trim();
  if (!limpo) return null;

  const coluna = COLUNA_POR_ID.get(limpo);
  if (coluna) {
    return { token: coluna.id, status: coluna.status, rotulo: coluna.titulo };
  }

  const extra = RECORTES_EXTRAS[limpo];
  if (extra) {
    return { token: limpo, status: extra.status, rotulo: extra.rotulo };
  }

  const status = limpo as LeadStatus;
  if (ESTAGIOS_FUNIL.includes(status)) {
    return { token: status, status: [status], rotulo: ROTULO_ESTAGIO[status] };
  }
  return null;
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
    // visão padrão de "tudo menos descartado". `in` cobre coluna (vários
    // status) e status solto (lista de um) com o mesmo caminho.
    ...(f.estagio ? { status: { in: f.estagio.status } } : {}),
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
  if (f.estagio) p.set("estagio", f.estagio.token);
  if (f.descartados) p.set("status", "descartados");
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined && v !== "") p.set(k, String(v));
  }
  return p.toString();
}

/**
 * Link da lista filtrada por estágio — o que o funil do Dashboard usa.
 *
 * Existe pra o nome do parâmetro morar **no mesmo arquivo que o parseia**. Na
 * primeira versão o funil apontava pra `?status=`, que aqui só significa
 * "descartados": o clique navegava e não filtrava nada, silenciosamente.
 */
export function hrefDoEstagio(token: string): string {
  const estagio = parseEstagio(token);
  const q = queryDoFiltro({
    categoria: null,
    site: null,
    scoreMin: null,
    comTelefone: false,
    semAtendimento: false,
    estagio,
    descartados: false,
  });
  return q ? `/leads?${q}` : "/leads";
}
