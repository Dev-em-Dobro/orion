"use server";

// F005 — Outreach de WhatsApp · F006 — suporte a follow-up (tipo).
// Specs: F005-outreach-whatsapp.md e F006-follow-up-e-funil.md
// F004 — dores persistidas (fallback: detectar do Diagnóstico se Lead antigo).

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import { detectarDores, textosDasDores } from "@/lib/dores";
import {
  gerarOutreach as gerarOutreachLib,
  OutreachError,
} from "@/lib/outreach/gerarOutreach";
import { createLlmForUser } from "@/lib/llm";
import type { ContextoLead } from "@/lib/outreach/prompt";
import { linkWhatsapp } from "@/lib/outreach/whatsappLink";

const schema = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
  tipo: z.enum(["primeira", "followup"]).default("primeira"),
});

export type GerarOutreachState =
  | { kind: "idle" }
  | { kind: "ok"; mensagem: string; waLink: string | null; outreachId: string }
  | { kind: "erro"; mensagem: string };

export async function gerarOutreachAction(
  _prev: GerarOutreachState,
  formData: FormData,
): Promise<GerarOutreachState> {
  const parsed = schema.safeParse({
    lead_id: formData.get("lead_id"),
    tipo: formData.get("tipo") ?? undefined,
  });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "Input inválido" };
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
        mensagem: "Diagnostique o Lead antes de gerar a Outreach",
      };
    }

    const dores =
      lead.dores.length > 0
        ? textosDasDores(lead.dores)
        : textosDasDores(detectarDores(diag, lead.website));

    const ctx: ContextoLead = {
      nome: lead.nome,
      categoria: lead.categoria,
      endereco: lead.endereco,
      dores,
    };

    let mensagem: string;
    try {
      ({ mensagem } = await gerarOutreachLib(ctx, llm, parsed.data.tipo));
    } catch (e) {
      if (e instanceof OutreachError) {
        return { kind: "erro", mensagem: e.message };
      }
      return {
        kind: "erro",
        mensagem: "Falha ao gerar a Outreach. Tente novamente.",
      };
    }

    const outreach = await prisma.outreach.create({
      data: {
        user_id: userId,
        lead_id: lead.id,
        canal: "whatsapp",
        conteudo: mensagem,
        enviado: false,
      },
    });

    revalidatePath("/leads");

    return {
      kind: "ok",
      mensagem,
      waLink: linkWhatsapp(lead.telefone, mensagem),
      outreachId: outreach.id,
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
