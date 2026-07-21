// F004 — textos de prompt a partir de Dores persistidas.

export type DorComDetalhes = { detalhes: string };

/** Strings prontas pro prompt (Outreach, proposta, etc.). */
export function textosDasDores(dores: DorComDetalhes[]): string[] {
  return dores.map((d) => d.detalhes).filter((t) => t.trim().length > 0);
}
