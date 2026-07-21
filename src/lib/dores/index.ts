// F004 — Dores: detecção, persistência e textos pra prompt.

export { detectarDores, type DorDetectada, type DiagnosticoParaDeteccao } from "./detectar";
export { substituirDoresDoLead } from "./persistir";
export { textosDasDores, type DorComDetalhes } from "./textos";

/** @deprecated Use `textosDasDores` com Dores persistidas (F004). */
export {
  derivarDoDiagnostico,
  type DiagnosticoParaDores,
} from "./derivarDoDiagnostico";
