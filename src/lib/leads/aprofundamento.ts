// F025 — constantes do aprofundamento em lotes.
// Spec: /specs/02-features/F025-fila-do-dia.md
//
// Fora da Server Action de propósito: um arquivo "use server" só pode exportar
// funções async, então constante compartilhada mora aqui.

/** Leads por chamada. Mantém cada requisição curta (ADR-002). */
export const LOTE_APROFUNDAMENTO = 3;

/** Teto do disparo automático depois de uma coleta. */
export const APROFUNDAR_POR_COLETA = 10;

/** F033 — opções de quantidade na busca (20/40/60 = 1/2/3 páginas). */
export const QUANTIDADES = [20, 40, 60] as const;
