"use server";

// F006 — Marcar Outreach como enviada e avançar o funil.
// Spec: /specs/02-features/F006-follow-up-e-funil.md

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireOutreachOwned } from "@/lib/db/scoped";

const schema = z.object({
  outreach_id: z.string().cuid("outreach_id inválido"),
});

export type MarcarEnviadoState =
  | { kind: "idle" }
  | { kind: "ok"; mensagem: string }
  | { kind: "erro"; mensagem: string };

export async function marcarEnviado(
  _prev: MarcarEnviadoState,
  formData: FormData,
): Promise<MarcarEnviadoState> {
  const parsed = schema.safeParse({ outreach_id: formData.get("outreach_id") });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "outreach_id inválido" };
  }

  try {
    const { outreach } = await requireOutreachOwned(parsed.data.outreach_id);

    const promove =
      outreach.lead.status === "priorizado" ||
      outreach.lead.status === "enriquecido";

    await prisma.$transaction([
      prisma.outreach.update({
        where: { id: outreach.id },
        data: { enviado: true, enviado_em: new Date() },
      }),
      ...(promove
        ? [
            prisma.lead.update({
              where: { id: outreach.lead_id },
              data: { status: "contatado" },
            }),
          ]
        : []),
    ]);

    revalidatePath("/leads");

    return {
      kind: "ok",
      mensagem: promove
        ? "Enviada ✓ — Lead movido para contatado."
        : "Enviada ✓.",
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
