"use server";

// F024 — descartar e restaurar Lead.
// Spec: /specs/02-features/F024-estado-do-lead-reversivel.md

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  mensagemEscopo,
  requireLeadOwned,
  requireTenant,
} from "@/lib/db/scoped";
import { mudarStatus, statusAoRestaurar } from "@/lib/leads/status";

const MOTIVO_MAX = 140;

const schemaDescartar = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
  motivo: z
    .string()
    .trim()
    .max(MOTIVO_MAX, `Motivo muito longo (máx. ${MOTIVO_MAX})`)
    .optional(),
});

const schemaRestaurar = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
});

export type DescarteState =
  | { kind: "idle" }
  | { kind: "ok"; status: string }
  | { kind: "erro"; mensagem: string };

function revalidar() {
  revalidatePath("/leads");
  revalidatePath("/");
}

export async function descartarLead(
  _prev: DescarteState,
  formData: FormData,
): Promise<DescarteState> {
  const motivoBruto = formData.get("motivo");
  const parsed = schemaDescartar.safeParse({
    lead_id: formData.get("lead_id"),
    motivo: typeof motivoBruto === "string" ? motivoBruto : undefined,
  });
  if (!parsed.success) {
    return {
      kind: "erro",
      mensagem: parsed.error.issues[0]?.message ?? "Input inválido",
    };
  }

  try {
    const { lead } = await requireLeadOwned(parsed.data.lead_id);

    await prisma.lead.update({
      where: { id: lead.id },
      data: mudarStatus("descartado", { motivo: parsed.data.motivo }),
    });

    revalidar();
    return { kind: "ok", status: "descartado" };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}

const schemaLote = z.object({
  // Vem como CSV de ids no FormData (a seleção da grade da F032).
  lead_ids: z
    .string()
    .transform((s) => s.split(",").map((v) => v.trim()).filter(Boolean))
    .pipe(
      z
        .array(z.string().cuid())
        .min(1, "Selecione ao menos um Lead")
        .max(200, "Selecione no máximo 200 por vez"),
    ),
});

export type DescarteLoteState =
  | { kind: "idle" }
  | { kind: "ok"; descartados: number }
  | { kind: "erro"; mensagem: string };

/**
 * F032 (AC6) — descarte dos Leads selecionados na grade. `updateMany` escopado
 * por `user_id`: ids de outro tenant simplesmente não casam, então o retorno
 * pode ser menor que o pedido — é isso que a UI informa.
 */
export async function descartarEmLote(
  _prev: DescarteLoteState,
  formData: FormData,
): Promise<DescarteLoteState> {
  const parsed = schemaLote.safeParse({ lead_ids: formData.get("lead_ids") });
  if (!parsed.success) {
    return {
      kind: "erro",
      mensagem: parsed.error.issues[0]?.message ?? "Seleção inválida",
    };
  }

  try {
    const { whereUser } = await requireTenant();

    const { count } = await prisma.lead.updateMany({
      where: { ...whereUser, id: { in: parsed.data.lead_ids } },
      data: mudarStatus("descartado"),
    });

    revalidar();
    return { kind: "ok", descartados: count };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}

export async function restaurarLead(
  _prev: DescarteState,
  formData: FormData,
): Promise<DescarteState> {
  const parsed = schemaRestaurar.safeParse({
    lead_id: formData.get("lead_id"),
  });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "lead_id inválido" };
  }

  try {
    const { lead, userId } = await requireLeadOwned(parsed.data.lead_id);

    if (lead.status !== "descartado") {
      // Idempotente: restaurar quem não está descartado não é erro nem no-op
      // silencioso — devolve o estado atual.
      return { kind: "ok", status: lead.status };
    }

    // "Tem score confirmado" hoje = tem Diagnóstico. Quando a F025 entrar,
    // o critério passa a ser `score_estimado = false`.
    const diagnosticos = await prisma.diagnostico.count({
      where: { lead_id: lead.id, user_id: userId },
    });
    const destino = statusAoRestaurar(diagnosticos > 0);

    await prisma.lead.update({
      where: { id: lead.id },
      data: mudarStatus(destino),
    });

    revalidar();
    return { kind: "ok", status: destino };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
