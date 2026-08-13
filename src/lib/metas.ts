// Meta mensal de abordagem — "o que eu já fiz este mês".
// Spec: /specs/02-features/F032-interface-do-orion.md ("o que já fiz")
//
// Existe porque o bloco de resultado da home só tinha Ganhos e Em aberto:
// ganho é raro demais pra dar noção de progresso no dia a dia, e "em aberto" é
// trabalho em curso, não trabalho feito. Faltava uma medida de **esforço**, e
// abordagem enviada é exatamente isso.
//
// Meta NÃO é cota. As duas são "X / Y este mês" e significam o oposto:
//
//   cota (F035)  → TETO que o aluno não quer bater. Vive no medidor da topbar.
//   meta (aqui)  → PISO que o aluno quer alcançar. Vive no bloco de resultado.
//
// Por isso não compartilham componente nem lugar na tela: duas barras iguais
// com sentidos invertidos confundem mais do que informam.

import { prisma } from "@/lib/db";
import { competenciaDe, intervaloDaCompetencia } from "@/lib/planos/competencia";

/**
 * Leads abordados por mês. Igual para todo plano — meta é objetivo de trabalho,
 * não coisa que se compra. Decisão do Ricardo (2026-08-13).
 */
export const META_ABORDADOS_MES = 100;

export type MetaDoMes = {
  abordados: number;
  meta: number;
  restante: number;
  /** Fração 0–1, saturada em 1. */
  fracao: number;
  batida: boolean;
};

/**
 * Conta **Leads distintos** com abordagem enviada na competência — não
 * Outreaches. Mandar três follow-ups pro mesmo Lead é um Lead abordado, não
 * três; senão a meta premiaria insistência em vez de alcance.
 *
 * `Outreach.enviado_em` já é persistido e o índice
 * `[lead_id, enviado, enviado_em]` já existe, então isto é uma consulta — sem
 * event log e sem cron (ADR-002).
 */
export async function metaDoMes(
  userId: string,
  agora: Date = new Date(),
): Promise<MetaDoMes> {
  const { inicio, fim } = intervaloDaCompetencia(competenciaDe(agora));

  const abordados = await prisma.lead.count({
    where: {
      user_id: userId,
      outreaches: {
        some: { enviado: true, enviado_em: { gte: inicio, lt: fim } },
      },
    },
  });

  return {
    abordados,
    meta: META_ABORDADOS_MES,
    restante: Math.max(0, META_ABORDADOS_MES - abordados),
    fracao: Math.min(1, abordados / META_ABORDADOS_MES),
    batida: abordados >= META_ABORDADOS_MES,
  };
}
