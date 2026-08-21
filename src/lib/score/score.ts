// F003 — score = Necessidade ⊕ Valor. Funções puras.
// Spec (fórmulas e pesos): /specs/02-features/F003-score-e-priorizacao.md
// Os pesos e faixas são os botões de calibragem — mudá-los exige mudar a spec.

import { tierDoNicho, type Tier } from "./nichos";

export type DiagnosticoParaScore = {
  tem_site: boolean;
  // F009: só Agregador/perfil social ⇒ não há site próprio ⇒ Necessidade máxima.
  site_e_agregador: boolean;
  tem_https: boolean | null;
  performance_mobile: number | null;
  /**
   * F003 (emenda 2026-08-14) — desempata o `performance_mobile = null`.
   * Opcional: Diagnóstico antigo ou site fora do ar não tem tempo medido.
   */
  tempo_carregamento_ms?: number | null;
};

const TIER_SCORE: Record<Tier, number> = { ALTO: 100, MEDIO: 55, BAIXO: 20 };

/**
 * F003 — corte de "Lead qualificado". Fonte única do 60: faixa visual da UI
 * (F032), chip "Score 60+" (F032) e contagem de "com potencial" da Triagem
 * (F025) leem daqui.
 */
export const SCORE_QUALIFICADO = 60;

function porteScore(num_avaliacoes: number | null): number {
  if (num_avaliacoes === null || num_avaliacoes <= 20) return 20;
  if (num_avaliacoes <= 80) return 50;
  if (num_avaliacoes <= 300) return 80;
  return 100;
}

/** Valor (0–100): "vale a pena abordar" = Tier de nicho + porte/movimento. */
export function valor(input: {
  categoria: string;
  num_avaliacoes: number | null;
}): { valor: number; tier: Tier } {
  const tier = tierDoNicho(input.categoria);
  const v = Math.round(
    0.6 * TIER_SCORE[tier] + 0.4 * porteScore(input.num_avaliacoes),
  );
  return { valor: v, tier };
}

/** Necessidade (0–100): "precisa de dev", derivada do último Diagnóstico. */
export function necessidade(diag: DiagnosticoParaScore): number {
  // Sem site OU só Agregador/perfil social (F009) = oportunidade máxima.
  if (!diag.tem_site || diag.site_e_agregador) return 100;

  let n = 20;
  const perf = diag.performance_mobile;
  if (perf === null) {
    // F003 (emenda 2026-08-14) — `null` estava achatando em +25 duas coisas
    // muito diferentes: o site que não deu pra medir e o que levou 6 segundos
    // pra abrir. O PSI desiste justamente nos piores, então quando a F002
    // mediu o carregamento e ele é ruim, isso É necessidade.
    const ms = diag.tempo_carregamento_ms;
    if (ms !== null && ms !== undefined && ms >= 5000) n += 50;
    else if (ms !== null && ms !== undefined && ms >= 3000) n += 35;
    else n += 25; // desconhecido de verdade
  } else if (perf < 50) n += 50;
  else if (perf < 80) n += 25;
  // perf >= 80 → +0

  if (diag.tem_https === false) n += 20;

  return Math.min(n, 100);
}

/** Score final (0–100), pendendo levemente pro Valor. */
export function calcularScore(input: {
  valor: number;
  necessidade: number;
}): number {
  return Math.round(0.55 * input.valor + 0.45 * input.necessidade);
}
