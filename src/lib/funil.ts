// F010 — lógica de domínio do funil de prospecção. Sem dependência de Next.
// Espelha a máquina de estados de /specs/01-domain-model.md.

import type { LeadStatus } from "@prisma/client";

// Ordem canônica do funil (preparo interno → funil de venda → desfecho).
// `descartado` (F024) fica fora: nunca esteve na disputa, então não é etapa.
export const ESTAGIOS_FUNIL: LeadStatus[] = [
  "novo",
  "enriquecido",
  "priorizado",
  "contatado",
  "respondeu",
  "qualificado",
  "proposta",
  "ganho",
  "perdido",
];

/**
 * Rótulo de exibição de cada estágio. **Único lugar autorizado a divergir do
 * nome do estado** — ver "Rótulo de exibição ≠ nome do estado" no domain model.
 *
 * Nenhuma tela escreve rótulo de estágio na mão: era assim que o badge do card
 * dizia uma coisa e o dropdown de "Corrigir status" dizia outra pro mesmo Lead.
 */
export const ROTULO_ESTAGIO: Record<LeadStatus, string> = {
  novo: "Novo",
  enriquecido: "Enriquecido",
  // Desde a F025 este estado é automático: o aprofundamento calcula o score e
  // promove sozinho. "Priorizado" descrevia algo que o aluno não executou e não
  // controla — e ecoava o botão "Priorizar", que não existe mais.
  priorizado: "Pronto pra abordar",
  contatado: "Contatado",
  respondeu: "Respondeu",
  qualificado: "Qualificado",
  proposta: "Proposta",
  ganho: "Ganho",
  perdido: "Perdido",
  descartado: "Descartado",
};

/**
 * F024 — Lead que o aluno decidiu nunca abordar. Some da lista, do funil e
 * das cobranças, mas continua no banco (e não volta como novidade na próxima
 * coleta, porque o dedupe é por `place_id`).
 */
export const STATUS_DESCARTADO: LeadStatus = "descartado";

/** Fragmento de where para esconder descartados da visão padrão. */
export const ONDE_NAO_DESCARTADO = {
  status: { not: STATUS_DESCARTADO },
} as const;

// Estágios "em aberto": no funil de venda e ainda sem desfecho final.
export const ESTAGIOS_EM_ABERTO: LeadStatus[] = [
  "contatado",
  "respondeu",
  "qualificado",
  "proposta",
];

/**
 * F012 (emenda 2026-08-13) — estágios em que faz sentido montar Proposta.
 *
 * Proposta é **resposta a um pedido**, não isca: mandar preço antes de haver
 * fit e intenção mata a conversa. Antes de `qualificado` o próximo passo é
 * Abordagem ou Objeções, não orçamento.
 */
export const ESTAGIOS_COM_PROPOSTA: LeadStatus[] = [
  "qualificado",
  "proposta",
  "ganho",
];

export function podeMontarProposta(status: LeadStatus): boolean {
  return ESTAGIOS_COM_PROPOSTA.includes(status);
}

// Sub-funil de venda na ordem de progressão. `perdido` fica fora — é vazamento
// lateral (pode sair de qualquer estágio), não um passo da cadeia de conversão.
export const FUNIL_VENDA: LeadStatus[] = [
  "contatado",
  "respondeu",
  "qualificado",
  "proposta",
  "ganho",
];

// Rank de progressão. `perdido` é desfecho terminal a partir de qualquer
// estágio pós-contatado — recebe o mesmo rank de `ganho`.
const RANK: Record<LeadStatus, number> = {
  novo: 0,
  enriquecido: 1,
  priorizado: 2,
  contatado: 3,
  respondeu: 4,
  qualificado: 5,
  proposta: 6,
  ganho: 7,
  perdido: 7,
  // F024 — terminal, igual a ganho/perdido: registrar desfecho não tira um
  // Lead de descartado (pra isso existe o Restaurar).
  descartado: 7,
};

// Registrar desfecho nunca regride o funil (F006/F010). `perdido` é permitido de
// qualquer estágio; os demais só avançam (rank destino ≥ rank atual).
//
// F024 — esta trava continua valendo pro **desfecho**. A porta pra voltar atrás
// é outra e explícita: `corrigirStatus`, que aceita qualquer destino.
export function podeRegistrarDesfecho(
  atual: LeadStatus,
  desfecho: LeadStatus,
): boolean {
  if (desfecho === "perdido") return true;
  return RANK[desfecho] >= RANK[atual];
}

export type PassoConversao = {
  de: LeadStatus;
  para: LeadStatus;
  taxa: number | null; // null quando a origem tem 0 — sem divisão por zero
};

// Taxas de conversão entre estágios consecutivos do funil de venda, sobre o
// estado atual: alcançou(X) = nº de Leads em X ou em qualquer estágio posterior
// da cadeia. Aproximação de snapshot (sem event log) — ver F010.
export function taxasDeConversao(
  porStatus: Record<LeadStatus, number>,
): PassoConversao[] {
  const alcancou = (i: number) =>
    FUNIL_VENDA.slice(i).reduce((soma, st) => soma + (porStatus[st] ?? 0), 0);

  const passos: PassoConversao[] = [];
  for (let i = 0; i < FUNIL_VENDA.length - 1; i++) {
    const de = FUNIL_VENDA[i];
    const para = FUNIL_VENDA[i + 1];
    if (!de || !para) continue;
    const origem = alcancou(i);
    passos.push({ de, para, taxa: origem > 0 ? alcancou(i + 1) / origem : null });
  }
  return passos;
}

// ---------------------------------------------------------------------------
// F034 — colunas do board. Não é entidade nova: é o `Lead.status` que já
// existe, agrupado. Spec: /specs/02-features/F034-funil-kanban.md
// ---------------------------------------------------------------------------

export type ColunaFunil = {
  id: string;
  titulo: string;
  /** Status que caem nesta coluna. O primeiro é o destino ao mover pra cá. */
  status: LeadStatus[];
  cor: string;
};

/**
 * `novo` não tem coluna: Lead sem Diagnóstico não está no funil de venda (ele
 * aparece na lista e na cobrança APROFUNDAR_FILA da F031).
 * `descartado` também não: saiu do funil por definição (F024).
 */
export const COLUNAS_FUNIL: ColunaFunil[] = [
  {
    id: "prontos",
    titulo: "Prontos",
    status: ["priorizado", "enriquecido"],
    cor: "#8b5cf6",
  },
  {
    id: "abordados",
    titulo: "Abordados",
    status: ["contatado"],
    cor: "#f59e0b",
  },
  {
    id: "responderam",
    titulo: "Responderam",
    status: ["respondeu"],
    cor: "#06b6d4",
  },
  {
    id: "qualificados",
    titulo: "Qualificados",
    status: ["qualificado"],
    cor: "#14b8a6",
  },
  { id: "proposta", titulo: "Proposta", status: ["proposta"], cor: "#6366f1" },
  { id: "ganhos", titulo: "Ganhos", status: ["ganho"], cor: "#22c55e" },
  { id: "perdidos", titulo: "Perdidos", status: ["perdido"], cor: "#ef4444" },
];

/** Todos os status que o board mostra. */
export const STATUS_DO_BOARD: LeadStatus[] = COLUNAS_FUNIL.flatMap(
  (c) => c.status,
);

export function colunaDoStatus(status: LeadStatus): ColunaFunil | null {
  return COLUNAS_FUNIL.find((c) => c.status.includes(status)) ?? null;
}

export const COLUNA_POR_ID = new Map(COLUNAS_FUNIL.map((c) => [c.id, c]));

/**
 * F010 (revisão 2026-08-13) — silhueta do funil do Dashboard.
 *
 * As mesmas colunas do kanban, menos `perdidos`: perdido é vazamento lateral
 * (sai de qualquer estágio), não um passo da cadeia. O Dashboard desenha ele
 * separado, fora da silhueta.
 *
 * Existe pra o Dashboard **não** ter a própria lista de estágios. Tinha uma —
 * 9 status soltos, com rótulos e cores copiados destes mesmos hexes — e os
 * números das duas telas não batiam.
 */
export const COLUNAS_SILHUETA: ColunaFunil[] = COLUNAS_FUNIL.filter(
  (c) => c.id !== "perdidos",
);

/** Soma a contagem por status nas colunas. */
export function contarPorColuna(
  porStatus: Record<LeadStatus, number>,
  colunas: ColunaFunil[] = COLUNAS_FUNIL,
): { coluna: ColunaFunil; total: number }[] {
  return colunas.map((coluna) => ({
    coluna,
    total: coluna.status.reduce((soma, st) => soma + (porStatus[st] ?? 0), 0),
  }));
}

/** Status que um card assume ao ser solto numa coluna. */
export function statusAoMover(colunaId: string): LeadStatus | null {
  return COLUNAS_FUNIL.find((c) => c.id === colunaId)?.status[0] ?? null;
}
