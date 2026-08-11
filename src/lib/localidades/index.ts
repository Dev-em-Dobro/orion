// F033 — municípios do Brasil (base estática do IBGE).
// Spec: /specs/02-features/F033-busca-estruturada.md
//
// Base gerada uma vez por `scripts/gerar-municipios.mts`, não uma API
// consultada em runtime: são 5.571 municípios que praticamente não mudam, e
// uma chamada externa por busca seria latência de graça.
//
// **Server-only**: este módulo importa o JSON (~83KB). Quem precisa só das UFs
// importa de `./ufs`, que não puxa a base.

import municipios from "./municipios.json";
import { type Uf } from "./ufs";

export { UFS, ufValida, type Uf } from "./ufs";

const POR_UF = municipios as Record<string, string[]>;

/** Municípios de uma UF, em ordem alfabética. */
export function municipiosDaUf(uf: Uf): string[] {
  return POR_UF[uf] ?? [];
}

/** O município pertence mesmo à UF? Evita busca com par inventado. */
export function municipioPertence(uf: Uf, municipio: string): boolean {
  const alvo = municipio.trim().toLowerCase();
  return municipiosDaUf(uf).some((m) => m.toLowerCase() === alvo);
}
