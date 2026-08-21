// F013 — constantes do Simulador. Módulo sem dependências: seguro pra importar
// tanto no server quanto no client (não arrasta prompts/SDK pro bundle).

/** Trava de custo: nº máximo de falas do treinando antes de encaminhar pro fecho. */
export const MAX_TURNOS = 20;

/**
 * Teto da categoria digitada à mão — o único texto do aluno que entra no system
 * prompt (F013, emenda de 2026-08-14). Nome de ramo é curto; o que passa disso
 * não é nome de ramo.
 */
export const MAX_CATEGORIA = 40;
