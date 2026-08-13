// F025 — constantes do aprofundamento em lotes.
// Spec: /specs/02-features/F025-fila-do-dia.md
//
// Fora da Server Action de propósito: um arquivo "use server" só pode exportar
// funções async, então constante compartilhada mora aqui.

/** Leads por chamada. Mantém cada requisição curta (ADR-002). */
export const LOTE_APROFUNDAMENTO = 3;

/** Teto do disparo automático depois de uma coleta. */
export const APROFUNDAR_POR_COLETA = 10;

/**
 * F033 — opções de quantidade na busca. Os três caem em fronteira de página do
 * Places (`PLACES_PAGE_SIZE = 20`), então nenhum resultado pago é descartado:
 * 20 = 1 página, 60 = 3, 100 = 5. **100 é o teto duro** — o schema da busca
 * (`lib/leads/busca.ts`) valida contra esta lista, então não há caminho que
 * colete mais do que isso numa chamada.
 */
export const QUANTIDADES = [20, 60, 100] as const;
