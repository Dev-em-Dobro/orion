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
