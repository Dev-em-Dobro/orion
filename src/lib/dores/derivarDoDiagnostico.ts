// Compat: até consumidores migrarem, deriva strings do Diagnóstico.
// Preferir `textosDasDores` com Dores persistidas (F004).

import { detectarDores, type DiagnosticoParaDeteccao } from "./detectar";
import { textosDasDores } from "./textos";

export type DiagnosticoParaDores = DiagnosticoParaDeteccao;

/** @deprecated Preferir Dores persistidas + `textosDasDores`. */
export function derivarDoDiagnostico(
  diag: DiagnosticoParaDores,
  website: string | null,
): string[] {
  return textosDasDores(detectarDores(diag, website));
}
