"use server";

// F011 — Assistente de Resposta a Objeções.
// Spec: /specs/02-features/F011-assistente-de-objecoes.md
// Assistente puro: NÃO muda status e NÃO persiste nada (padrão F008).

import { z } from "zod";
import { prisma } from "@/lib/db";
import { createLlmForUser } from "@/lib/llm";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import { detectarDores, textosDasDores } from "@/lib/dores";
import {
  responderObjecao as responderObjecaoLib,
  ObjecaoError,
  type RespostaObjecao,
} from "@/lib/objecoes/responderObjecao";

const schema = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
  mensagem_do_lead: z
    .string()
    .trim()
    .min(2, "Cole a mensagem do Lead")
    .max(1000, "Mensagem muito longa"),
});

export type ResponderObjecaoState =
  | { kind: "idle" }
  | { kind: "ok"; respostas: RespostaObjecao[] }
  | { kind: "erro"; mensagem: string };

export async function responderObjecaoAction(
  _prev: ResponderObjecaoState,
  formData: FormData,
): Promise<ResponderObjecaoState> {
  const parsed = schema.safeParse({
    lead_id: formData.get("lead_id"),
    mensagem_do_lead: formData.get("mensagem_do_lead"),
  });
  if (!parsed.success) {
    // AC5/AC8: erro de campo específico (Zod), sem chamada externa.
    return {
      kind: "erro",
      mensagem: parsed.error.issues[0]?.message ?? "Input inválido",
    };
  }

  try {
    const { userId } = await requireTenant();
    const llm = await createLlmForUser(userId);
    const lead = await prisma.lead.findFirst({
      where: { id: parsed.data.lead_id, user_id: userId },
      include: {
        diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 },
        dores: true,
      },
    });
    if (!lead) {
      return { kind: "erro", mensagem: "Lead não encontrado" };
    }

    const diag = lead.diagnosticos[0];
    if (!diag) {
      return {
        kind: "erro",
        mensagem: "Diagnostique o Lead antes de responder objeções",
      };
    }

    const dores =
      lead.dores.length > 0
        ? textosDasDores(lead.dores)
        : textosDasDores(detectarDores(diag, lead.website));

    let respostas: RespostaObjecao[];
    try {
      ({ respostas } = await responderObjecaoLib(
        {
          nome: lead.nome,
          categoria: lead.categoria,
          dores,
          mensagemDoLead: parsed.data.mensagem_do_lead,
        },
        llm,
      ));
    } catch (e) {
      if (e instanceof ObjecaoError) {
        return { kind: "erro", mensagem: e.message };
      }
      return {
        kind: "erro",
        mensagem: "Falha ao gerar as respostas. Tente novamente.",
      };
    }

    return { kind: "ok", respostas };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
