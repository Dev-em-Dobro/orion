"use server";

// F005 — Outreach de WhatsApp · F006 — suporte a follow-up (tipo).
// Specs: F005-outreach-whatsapp.md e F006-follow-up-e-funil.md
// F004 — dores persistidas (fallback: detectar do Diagnóstico se Lead antigo).
//
// F027 (Outreach por e-mail) saiu do produto em 2026-08-13 — ver F035, "Saída
// do Outreach por e-mail". O canal volta a ser só WhatsApp.

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
import { estornarCota, reservarCota } from "@/lib/limites";
import { consumirMensal, verificarLimiteMensal } from "@/lib/planos";
import type { ContextoLead } from "@/lib/outreach/prompt";
import { linkWhatsapp } from "@/lib/outreach/whatsappLink";

const schema = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
  tipo: z.enum(["primeira", "followup"]).default("primeira"),
  // Enum de um valor só, de propósito: chamada direta com `canal=email` é
  // **rejeitada aqui**, não apenas escondida na UI (F035 AC20).
  canal: z.enum(["whatsapp"]).default("whatsapp"),
});

export type GerarOutreachState =
  | { kind: "idle" }
  | {
      kind: "ok";
      canal: "whatsapp";
      mensagem: string;
      waLink: string | null;
      outreachId: string;
    }
  | { kind: "erro"; mensagem: string };

export async function gerarOutreachAction(
  _prev: GerarOutreachState,
  formData: FormData,
): Promise<GerarOutreachState> {
  const parsed = schema.safeParse({
    lead_id: formData.get("lead_id"),
    tipo: formData.get("tipo") ?? undefined,
    canal: formData.get("canal") ?? undefined,
  });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "Input inválido" };
  }

  let reservou = false;
  let userId: string | null = null;

  try {
    ({ userId } = await requireTenant());
    // F035 — teto mensal do plano antes da cota diária e de qualquer chamada
    // de IA: no limite, nada é gasto.
    await verificarLimiteMensal(userId, "outreach");
    await reservarCota(userId, "outreach");
    reservou = true;
    const llm = await createLlmForUser(userId);
    const lead = await prisma.lead.findFirst({
      where: { id: parsed.data.lead_id, user_id: userId },
      include: {
        diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 },
        dores: true,
      },
    });
    if (!lead) {
      await estornarCota(userId, "outreach");
      reservou = false;
      return { kind: "erro", mensagem: "Lead não encontrado" };
    }

    const diag = lead.diagnosticos[0];
    if (!diag) {
      await estornarCota(userId, "outreach");
      reservou = false;
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
      await estornarCota(userId, "outreach");
      reservou = false;
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
        canal: parsed.data.canal,
        assunto: null,
        conteudo: mensagem,
        enviado: false,
      },
    });

    // Só depois de gravar: o teto mensal conta Outreach que existe, não
    // tentativa. Falha antes daqui já devolveu a cota diária.
    await consumirMensal(userId, "outreach");

    revalidatePath("/leads");
    revalidatePath(`/leads/${lead.id}`);

    return {
      kind: "ok",
      canal: parsed.data.canal,
      mensagem,
      waLink: linkWhatsapp(lead.telefone, mensagem),
      outreachId: outreach.id,
    };
  } catch (e) {
    if (reservou && userId) {
      await estornarCota(userId, "outreach").catch(() => undefined);
    }
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
