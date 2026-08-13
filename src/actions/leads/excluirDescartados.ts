"use server";

// F024 — excluir de vez os Leads descartados do aluno.
// Spec: /specs/02-features/F024-estado-do-lead-reversivel.md
//
// Única exclusão destrutiva da feature, e só alcança `descartado`. Diagnóstico,
// Dor e Abordagem vão junto por cascata (schema). Exige confirmação na UI: o
// aluno digita a quantidade que espera excluir, e a action só age se bater com
// o que existe — assim um clique errado não leva a base embora.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";

const schema = z.object({
  confirmacao: z.coerce
    .number()
    .int("Confirmação inválida")
    .nonnegative("Confirmação inválida"),
});

export type ExcluirDescartadosState =
  | { kind: "idle" }
  | { kind: "ok"; excluidos: number }
  | { kind: "erro"; mensagem: string };

export async function excluirDescartados(
  _prev: ExcluirDescartadosState,
  formData: FormData,
): Promise<ExcluirDescartadosState> {
  const parsed = schema.safeParse({
    confirmacao: formData.get("confirmacao"),
  });
  if (!parsed.success) {
    return {
      kind: "erro",
      mensagem: "Digite a quantidade de descartados para confirmar.",
    };
  }

  try {
    const { whereUser } = await requireTenant();
    const where = { ...whereUser, status: "descartado" as const };

    const existentes = await prisma.lead.count({ where });
    if (existentes !== parsed.data.confirmacao) {
      return {
        kind: "erro",
        mensagem: `Você tem ${existentes} Lead(s) descartado(s) — confirme com esse número.`,
      };
    }

    const { count } = await prisma.lead.deleteMany({ where });

    revalidatePath("/leads");
    revalidatePath("/");

    return { kind: "ok", excluidos: count };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
