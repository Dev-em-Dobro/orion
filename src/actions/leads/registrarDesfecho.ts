"use server";

// F006 — Registrar o desfecho do Lead no funil.
// Spec: /specs/02-features/F006-follow-up-e-funil.md

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireLeadOwned } from "@/lib/db/scoped";
import { podeRegistrarDesfecho } from "@/lib/funil";

const schema = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
  desfecho: z.enum(["respondeu", "qualificado", "proposta", "ganho", "perdido"]),
});

export type DesfechoState =
  | { kind: "idle" }
  | { kind: "ok"; status: string }
  | { kind: "erro"; mensagem: string };

export async function registrarDesfecho(
  _prev: DesfechoState,
  formData: FormData,
): Promise<DesfechoState> {
  const parsed = schema.safeParse({
    lead_id: formData.get("lead_id"),
    desfecho: formData.get("desfecho"),
  });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "Input inválido" };
  }

  try {
    const { lead } = await requireLeadOwned(parsed.data.lead_id);

    if (!podeRegistrarDesfecho(lead.status, parsed.data.desfecho)) {
      return { kind: "ok", status: lead.status };
    }

    await prisma.lead.update({
      where: { id: lead.id },
      data: { status: parsed.data.desfecho },
    });

    revalidatePath("/leads");
    revalidatePath("/");

    return { kind: "ok", status: parsed.data.desfecho };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
