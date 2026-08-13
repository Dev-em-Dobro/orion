"use server";

// F024 — corrigir o status do Lead, inclusive regredindo.
// Spec: /specs/02-features/F024-estado-do-lead-reversivel.md
//
// Porta separada do `registrarDesfecho` de propósito: lá a trava
// `podeRegistrarDesfecho` impede regressão (desfecho não deve voltar sozinho);
// aqui o aluno está declarando que o registro estava errado. Nunca apaga
// Diagnóstico, Dor nem Abordagem — só muda o estado do funil.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireLeadOwned } from "@/lib/db/scoped";
import { mudarStatus } from "@/lib/leads/status";

const schema = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
  status: z.enum([
    "novo",
    "enriquecido",
    "priorizado",
    "contatado",
    "respondeu",
    "qualificado",
    "proposta",
    "ganho",
    "perdido",
    "descartado",
  ]),
});

export type CorrigirStatusState =
  | { kind: "idle" }
  | { kind: "ok"; status: string }
  | { kind: "erro"; mensagem: string };

export async function corrigirStatus(
  _prev: CorrigirStatusState,
  formData: FormData,
): Promise<CorrigirStatusState> {
  const parsed = schema.safeParse({
    lead_id: formData.get("lead_id"),
    status: formData.get("status"),
  });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "Input inválido" };
  }

  try {
    const { lead } = await requireLeadOwned(parsed.data.lead_id);

    await prisma.lead.update({
      where: { id: lead.id },
      data: mudarStatus(parsed.data.status),
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${lead.id}`);
    revalidatePath("/");

    return { kind: "ok", status: parsed.data.status };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
