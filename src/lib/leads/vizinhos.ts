// F032 (AC8) — navegação ‹ › entre os Leads do filtro de origem.
// Spec: /specs/02-features/F032-interface-do-orion.md
//
// Keyset, não offset: em vez de carregar a lista inteira pra achar a posição,
// pergunta ao banco "qual o próximo depois deste?" usando a mesma ordenação da
// lista (score desc, created_at desc). Custo constante, e usa o índice
// (user_id, score desc, created_at desc) criado na F028.

import type { Prisma } from "@prisma/client";

export type Cursor = { score: number; created_at: Date };

/**
 * Leads que vêm **depois** do cursor na ordem da lista.
 * Ordem: score desc, created_at desc → "depois" = score menor, ou score igual
 * com created_at menor.
 */
export function whereDepois(c: Cursor): Prisma.LeadWhereInput {
  return {
    OR: [
      { score: { lt: c.score } },
      { score: c.score, created_at: { lt: c.created_at } },
    ],
  };
}

/** Leads que vêm **antes** do cursor na ordem da lista. */
export function whereAntes(c: Cursor): Prisma.LeadWhereInput {
  return {
    OR: [
      { score: { gt: c.score } },
      { score: c.score, created_at: { gt: c.created_at } },
    ],
  };
}

export const ORDEM_LISTA = [
  { score: "desc" as const },
  { created_at: "desc" as const },
];

/** Ordem invertida — pra pegar o vizinho anterior com `take: 1`. */
export const ORDEM_INVERSA = [
  { score: "asc" as const },
  { created_at: "asc" as const },
];
