// F025 — priorização automática: o score deixa de ser um botão.
// Spec: /specs/02-features/F025-fila-do-dia.md
//
// Ponto único de "score confirmado": chamado pelo aprofundamento em lote, pelo
// Diagnóstico manual e pelo re-diagnóstico. Antes disso, priorizar era uma
// Server Action que o aluno tinha que lembrar de apertar, Lead a Lead.

import { prisma } from "@/lib/db";
import { mudarStatus } from "@/lib/leads/status";
import {
  calcularScore,
  necessidade as calcularNecessidade,
  valor as calcularValor,
} from "./score";
import type { Tier } from "./nichos";

export type ResultadoRecalculo = {
  score: number;
  valor: number;
  necessidade: number;
  tier: Tier;
};

/**
 * Recalcula e grava o score a partir do **último** Diagnóstico do Lead.
 * Devolve `null` quando não há Diagnóstico — sem ele não há score confirmado.
 *
 * Promove `novo`/`enriquecido` → `priorizado`. Qualquer outro status é
 * preservado: re-priorizar não regride o funil (regra da F003, mantida).
 */
export async function recalcularScore(
  userId: string,
  leadId: string,
): Promise<ResultadoRecalculo | null> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, user_id: userId },
    include: { diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 } },
  });
  if (!lead) return null;

  const diag = lead.diagnosticos[0];
  if (!diag) return null;

  const { valor: v, tier } = calcularValor({
    categoria: lead.categoria,
    num_avaliacoes: lead.num_avaliacoes,
  });
  const n = calcularNecessidade({
    tem_site: diag.tem_site,
    site_e_agregador: diag.site_e_agregador,
    tem_https: diag.tem_https,
    performance_mobile: diag.performance_mobile,
    // F003 (emenda 2026-08-14) — desempata o `performance_mobile = null`.
    tempo_carregamento_ms: diag.tempo_carregamento_ms,
  });
  const score = calcularScore({ valor: v, necessidade: n });

  const promove = lead.status === "novo" || lead.status === "enriquecido";

  await prisma.lead.update({
    where: { id: lead.id },
    data: {
      score,
      // Score confirmado: saiu de Diagnóstico real, não da Triagem.
      score_estimado: false,
      ...(promove ? mudarStatus("priorizado") : {}),
    },
  });

  return { score, valor: v, necessidade: n, tier };
}
