// F024 — ponto único de mudança de status do Lead.
// Spec: /specs/02-features/F024-estado-do-lead-reversivel.md
//
// Toda transição passa por aqui pra que `status_em` nunca seja esquecido — é
// dele que a Central de Tarefas (F031) tira "parado há quanto tempo". Devolve
// o payload do update em vez de escrever, pra quem chama seguir dono da sua
// transação. Puro: sem Prisma, sem Next.

import type { LeadStatus, Prisma } from "@prisma/client";

export type OpcoesMudancaStatus = {
  /** Só usado quando o destino é `descartado`. */
  motivo?: string | null;
  /** Injeção de relógio pros testes. */
  agora?: Date;
};

/**
 * Campos de update para assumir um status novo.
 *
 * `motivo_descarte` só sobrevive em `descartado`: qualquer outro destino o
 * limpa, então restaurar um Lead não deixa para trás o motivo de um descarte
 * que não vale mais.
 */
export function mudarStatus(
  status: LeadStatus,
  { motivo, agora = new Date() }: OpcoesMudancaStatus = {},
): Prisma.LeadUncheckedUpdateInput {
  return {
    status,
    status_em: agora,
    motivo_descarte:
      status === "descartado" ? (motivo?.trim() || null) : null,
  };
}

/**
 * Para onde volta um Lead restaurado. Não guardamos o status anterior (seria
 * histórico, fora do escopo da F024): quem já tinha score confirmado volta
 * pronto pra abordagem; quem não tinha volta pro começo da esteira.
 */
export function statusAoRestaurar(temScoreConfirmado: boolean): LeadStatus {
  return temScoreConfirmado ? "priorizado" : "novo";
}
