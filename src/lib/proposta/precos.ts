// F012 — Preço determinístico (NUNCA gerado pela IA). Constantes = botões de
// calibragem: mudá-las é mudança de estratégia → editar a spec antes.
// Spec: /specs/02-features/F012-gerador-de-proposta.md

import { tierDoNicho, type Tier } from "../score/nichos";
import type { Servico } from "./servicos";

// Preço-base por Serviço (BRL, faixa min–max). DEFAULTS de partida — ajuste ao
// seu mercado. São chutes iniciais, não tabela de verdade.
const BASE: Record<Servico, { min: number; max: number }> = {
  CRIACAO_SITE: { min: 1500, max: 3000 },
  OTIMIZACAO_PERFORMANCE: { min: 600, max: 1200 },
  SSL_SEGURANCA: { min: 200, max: 500 },
  PRESENCA_BASE: { min: 800, max: 1500 },
};

const MULT_TIER: Record<Tier, number> = { ALTO: 1.4, MEDIO: 1.0, BAIXO: 0.7 };

// Porte (num_avaliacoes) é proxy de verba — ver playbook de nichos.
function multPorte(num_avaliacoes: number | null): number {
  if (num_avaliacoes === null || num_avaliacoes <= 20) return 0.9;
  if (num_avaliacoes <= 80) return 1.0;
  if (num_avaliacoes <= 300) return 1.15;
  return 1.3;
}

// Arredonda pra múltiplos de R$50 (proposta com número "redondo").
// Math.round(v) antes do /50 evita IEEE-754 (ex.: 1500×1.15 → 1724.999… → 1700).
function arredondar50(v: number): number {
  return Math.round(Math.round(v) / 50) * 50;
}

export type Precificacao = {
  servicos: Servico[];
  tier: Tier;
  faixa_min: number;
  faixa_max: number;
  moeda: "BRL";
};

/** Faixa (min–max) somando os Serviços × multiplicadores de Tier e porte. */
export function precificar(input: {
  servicos: Servico[];
  categoria: string;
  num_avaliacoes: number | null;
}): Precificacao {
  const tier = tierDoNicho(input.categoria);
  const mult = MULT_TIER[tier] * multPorte(input.num_avaliacoes);

  let min = 0;
  let max = 0;
  for (const s of input.servicos) {
    min += BASE[s].min;
    max += BASE[s].max;
  }

  return {
    servicos: input.servicos,
    tier,
    faixa_min: arredondar50(min * mult),
    faixa_max: arredondar50(max * mult),
    moeda: "BRL",
  };
}
