"use server";

// F003 — Score e priorização por valor de nicho.
// Spec: /specs/02-features/F003-score-e-priorizacao.md

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import {
  valor as calcularValor,
  necessidade as calcularNecessidade,
  calcularScore,
} from "@/lib/score/score";

const schema = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
});

export type PriorizarState =
  | { kind: "idle" }
  | { kind: "ok"; resumo: string }
  | { kind: "erro"; mensagem: string };

export async function priorizarLead(
  _prev: PriorizarState,
  formData: FormData,
): Promise<PriorizarState> {
  const parsed = schema.safeParse({ lead_id: formData.get("lead_id") });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "lead_id inválido" };
  }

  try {
    const { userId } = await requireTenant();
    const lead = await prisma.lead.findFirst({
      where: { id: parsed.data.lead_id, user_id: userId },
      include: { diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 } },
    });
    if (!lead) {
      return { kind: "erro", mensagem: "Lead não encontrado" };
    }

    const diag = lead.diagnosticos[0];
    if (!diag) {
      return {
        kind: "erro",
        mensagem: "Lead sem Diagnóstico — diagnostique antes de priorizar",
      };
    }

    const { valor: v, tier } = calcularValor({
      categoria: lead.categoria,
      num_avaliacoes: lead.num_avaliacoes,
    });
    const n = calcularNecessidade({
      tem_site: diag.tem_site,
      site_e_agregador: diag.site_e_agregador,
      tem_https: diag.tem_https,
      performance_mobile: diag.performance_mobile,
    });
    const score = calcularScore({ valor: v, necessidade: n });

    await prisma.lead.update({
      where: { id: lead.id },
      data:
        lead.status === "enriquecido"
          ? { score, status: "priorizado" }
          : { score },
    });

    revalidatePath("/leads");

    const avis = lead.num_avaliacoes ?? 0;
    return {
      kind: "ok",
      resumo: `Score ${score} — Valor ${v} (${tier} · ${avis} avaliações) · Necessidade ${n}.`,
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
