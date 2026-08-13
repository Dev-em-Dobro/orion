// F032 — faixa visual do score. Lógica pura, fora do componente: `ui.tsx` tem
// JSX e não é importável de um teste unitário.
// Spec: /specs/02-features/F032-interface-do-orion.md

import { SCORE_QUALIFICADO } from "@/lib/score/score";

const ALTO = SCORE_QUALIFICADO;
const MEDIO = 30;

/**
 * Classe do badge de score.
 *
 * `estimado` não ganha cor de faixa, e isso é o ponto: **a cor é uma promessa
 * de confiança**, e a Triagem não tem como sustentá-la — ela chuta a partir de
 * nicho e porte, sem abrir o site. Até 2026-08-13 um `92` estimado recebia o
 * mesmo verde de um `90` confirmado, e a única diferença que importa pra
 * decidir quem abordar era justamente a que o visual apagava. Agora o estimado
 * é contorno neutro: dá pra ver de longe que ainda não vale confiar.
 */
export function scoreBadge(score: number, estimado = false): string {
  if (estimado) return "border border-border-strong text-muted";
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
