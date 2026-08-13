"use server";

// F006 — Marcar Abordagem como enviada e avançar o funil.
// Spec: /specs/02-features/F006-follow-up-e-funil.md

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireAbordagemOwned } from "@/lib/db/scoped";
import { mudarStatus } from "@/lib/leads/status";

const schema = z.object({
  abordagem_id: z.string().cuid("abordagem_id inválido"),
});

export type MarcarEnviadoState =
  | { kind: "idle" }
  | { kind: "ok"; mensagem: string }
  | { kind: "erro"; mensagem: string };

export async function marcarEnviado(
  _prev: MarcarEnviadoState,
  formData: FormData,
): Promise<MarcarEnviadoState> {
  const parsed = schema.safeParse({ abordagem_id: formData.get("abordagem_id") });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "abordagem_id inválido" };
  }

  try {
    const { abordagem } = await requireAbordagemOwned(parsed.data.abordagem_id);

    const promove =
      abordagem.lead.status === "priorizado" ||
      abordagem.lead.status === "enriquecido";

    await prisma.$transaction([
      prisma.abordagem.update({
        where: { id: abordagem.id },
        data: { enviado: true, enviado_em: new Date() },
      }),
      ...(promove
        ? [
            prisma.lead.update({
              where: { id: abordagem.lead_id },
              data: mudarStatus("contatado"),
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
