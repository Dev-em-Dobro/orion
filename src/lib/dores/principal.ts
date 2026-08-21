// F032 — a Dor que o card mostra.
// Spec: /specs/02-features/F032-interface-do-orion.md
//
// O card tem espaço para uma linha só. Mostra a Dor de maior severidade — é
// ela que sustenta a abordagem. Sem Dor detectada, a linha some: o card não
// inventa texto (a referência usa dica genérica; aqui sai de Diagnóstico real).

import type { Severidade } from "@prisma/client";

export type DorParaExibir = { severidade: Severidade; detalhes: string };

const PESO: Record<Severidade, number> = { ALTA: 3, MEDIA: 2, BAIXA: 1 };

/** Dor de maior severidade; empate mantém a ordem de entrada. */
export function dorPrincipal<T extends DorParaExibir>(
  dores: readonly T[],
): T | null {
  let melhor: T | null = null;
  for (const dor of dores) {
    if (!melhor || PESO[dor.severidade] > PESO[melhor.severidade]) {
      melhor = dor;
    }
  }
  return melhor;
}
