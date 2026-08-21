"use server";

// F031 — adiar e dispensar cobranças.
// Spec: /specs/02-features/F031-central-de-tarefas.md
//
// A Tarefa não é persistida; o adiamento é. Ele guarda o `marco` do fato que
// originou a cobrança — se o marco mudar (nova Abordagem, status novo), a
// cobrança volta sozinha. Sem isso, dispensar viraria silêncio permanente.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import { ADIAR_MS } from "@/lib/tarefas/regras";

const schema = z.object({
  tipo: z.enum([
    "CONFIRMAR_RESPOSTA",
    "MANDAR_FOLLOWUP",
    "ENVIAR_ABORDAGEM",
    "AVANCAR_RESPONDEU",
    "COBRAR_PROPOSTA",
    "APROFUNDAR_FILA",
  ]),
  lead_id: z.string().cuid().nullable(),
  marco: z.coerce.date(),
});

export type TarefaState =
  | { kind: "idle" }
  | { kind: "ok" }
  | { kind: "erro"; mensagem: string };

function parse(formData: FormData) {
  const leadId = formData.get("lead_id");
  return schema.safeParse({
    tipo: formData.get("tipo"),
    lead_id: typeof leadId === "string" && leadId ? leadId : null,
    marco: formData.get("marco"),
  });
}

async function registrar(
  formData: FormData,
  dados: { adiada_ate?: Date; dispensada_em?: Date },
): Promise<TarefaState> {
  const parsed = parse(formData);
  if (!parsed.success) {
    return { kind: "erro", mensagem: "Tarefa inválida" };
  }

  try {
    const { userId } = await requireTenant();
    const { tipo, lead_id, marco } = parsed.data;

    // `upsert` não serve: no Postgres, NULLs são distintos num índice único,
    // então a tarefa agregada (lead_id null) nunca casaria.
    const existente = await prisma.tarefaAdiamento.findFirst({
      where: { user_id: userId, lead_id, tipo },
      select: { id: true },
    });

    const valores = {
      marco,
      adiada_ate: dados.adiada_ate ?? null,
      dispensada_em: dados.dispensada_em ?? null,
    };

    if (existente) {
      await prisma.tarefaAdiamento.update({
        where: { id: existente.id },
        data: valores,
      });
    } else {
      await prisma.tarefaAdiamento.create({
        data: { user_id: userId, lead_id, tipo, ...valores },
      });
    }

    revalidatePath("/tarefas");
    revalidatePath("/");
    return { kind: "ok" };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}

export async function adiarTarefa(
  _prev: TarefaState,
  formData: FormData,
): Promise<TarefaState> {
  return registrar(formData, { adiada_ate: new Date(Date.now() + ADIAR_MS) });
}

export async function dispensarTarefa(
  _prev: TarefaState,
  formData: FormData,
): Promise<TarefaState> {
  return registrar(formData, { dispensada_em: new Date() });
}
