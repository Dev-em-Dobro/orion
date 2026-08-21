// F003 — Mapa nicho → Tier. Fonte única: /specs/05-playbook/nichos-alto-valor.md.
// Mudar a classificação de um nicho é mudança de estratégia → editar o playbook antes.
//
// F033 — os tipos deixaram de ser duas listas soltas aqui: derivam do catálogo
// de nichos, que também alimenta o dropdown da busca. Uma fonte só evita o
// playbook, o dropdown e o Tier divergirem.

import { NICHOS } from "@/lib/nichos/catalogo";
import type { Tier } from "@/lib/nichos/tier";

export type { Tier };

/**
 * `primaryType` → Tier. O primeiro nicho que reivindica um tipo vence, e o
 * catálogo lista ALTO antes de MÉDIO — então "doctor", que aparece em vários
 * nichos de saúde, fica ALTO.
 */
const POR_TIPO: Map<string, Tier> = new Map();
for (const nicho of NICHOS) {
  for (const tipo of nicho.primaryTypes) {
    const chave = tipo.toLowerCase();
    if (!POR_TIPO.has(chave)) POR_TIPO.set(chave, nicho.tier);
  }
}

/** Classifica a categoria do Lead. Não mapeada → BAIXO (conservador). */
export function tierDoNicho(categoria: string): Tier {
  return POR_TIPO.get(categoria.toLowerCase()) ?? "BAIXO";
}
