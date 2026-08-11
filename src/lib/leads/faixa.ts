// F032 — faixa visual do score. Lógica pura, fora do componente: `ui.tsx` tem
// JSX e não é importável de um teste unitário.
// Spec: /specs/02-features/F032-interface-do-orion.md

import { SCORE_QUALIFICADO } from "@/lib/score/score";

const ALTO = SCORE_QUALIFICADO;
const MEDIO = 30;

export function scoreBadge(score: number): string {
  if (score >= ALTO) return "bg-emerald-500/15 text-emerald-300";
  if (score >= MEDIO) return "bg-amber-500/15 text-amber-300";
  return "bg-zinc-500/15 text-zinc-400";
}

/**
 * Rótulo de **UI**, não termo de domínio: a referência (LeadSite) chama isso de
 * "Quente/Morno", o que seria sinônimo de `score` e é proibido pelo domain
 * model. Mesmos cortes do `scoreBadge` — a régua fica num lugar só.
 */
export function faixaDeScore(score: number): "Alto" | "Médio" | "Baixo" {
  if (score >= ALTO) return "Alto";
  if (score >= MEDIO) return "Médio";
  return "Baixo";
}
