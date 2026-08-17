"use server";

// F005 — Abordagem de WhatsApp · F006 — suporte a follow-up (tipo).
// Specs: F005-abordagem-whatsapp.md e F006-follow-up-e-funil.md
// F004 — dores persistidas (fallback: detectar do Diagnóstico se Lead antigo).
//
// F027 (Abordagem por e-mail) saiu do produto em 2026-08-13 — ver F035, "Saída
// da Abordagem por e-mail".
//
// F038 — o canal `ligacao` (roteiro falado) entra aqui, e não numa Action
// própria: mesma Dor, mesmo Diagnóstico exigido, mesma cota. Só o system prompt
// e o `wa.me` mudam.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import { demoUrlFor } from "@/lib/demos";
import { detectarDores } from "@/lib/dores";
import {
  gerarAbordagem as gerarAbordagemLib,
  gerarRoteiroLigacao,
  type ContextoLead,
} from "@/lib/abordagem/gerarAbordagem";
import { linkWhatsapp } from "@/lib/abordagem/whatsappLink";

const schema = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
  tipo: z.enum(["primeira", "followup"]).default("primeira"),
  // `email` fica **de fora do enum** de propósito: chamada direta com
  // `canal=email` é rejeitada aqui, não apenas escondida na UI (F035 AC20).
  // `ligacao` entra na F038.
  canal: z.enum(["whatsapp", "ligacao"]).default("whatsapp"),
});

export type CanalGeravel = "whatsapp" | "ligacao";

export type GerarAbordagemState =
  | { kind: "idle" }
  | {
      kind: "ok";
      canal: CanalGeravel;
      mensagem: string;
      /** F038 — sempre `null` no canal `ligacao`: roteiro não se envia. */
      waLink: string | null;
      abordagemId: string;
    }
  | { kind: "erro"; mensagem: string };

export async function gerarAbordagemAction(
  _prev: GerarAbordagemState,
  formData: FormData,
): Promise<GerarAbordagemState> {
  const parsed = schema.safeParse({
    lead_id: formData.get("lead_id"),
    tipo: formData.get("tipo") ?? undefined,
    canal: formData.get("canal") ?? undefined,
  });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "Input inválido" };
  }

  try {
    const { userId } = await requireTenant();
    // A Abordagem não tem limite nenhum desde 2026-08-16: nem cota diária
    // (F018), nem teto de plano (F035). Custa R$0 porque é montada em código, e
    // o teto de 150/mês contradizia os 300 Leads que o Pro compra — com o
    // follow-up consumindo a mesma cota, dava 75 Leads trabalhados de 300.
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
        mensagem: "Diagnostique o Lead antes de gerar a Abordagem",
      };
    }

    // Dores estruturadas, não os textos: o montador escolhe a abertura pelo
    // `tipo` da Dor de maior severidade. `textosDasDores` jogava o tipo fora —
    // servia pro prompt, que só queria prosa.
    const dores =
      lead.dores.length > 0 ? lead.dores : detectarDores(diag, lead.website);

    const ehLigacao = parsed.data.canal === "ligacao";

    const ctx: ContextoLead = {
      nome: lead.nome,
      categoria: lead.categoria,
      endereco: lead.endereco,
      dores,
      // F038 — o site de amostra é servido fora do Orion (`DEMOS_BASE_URL`), sem
      // login: o dono do negócio abre o link direto. `null` quando não há demo,
      // e aí o prompt não cita nada.
      demoUrl: demoUrlFor(lead.place_id),
      // A rotação de variantes é semeada pelo Lead: dois alunos prospectando o
      // mesmo negócio têm `id` diferentes e sorteiam independentemente (F005).
      seed: lead.id,
    };

    const { mensagem } = ehLigacao
      ? gerarRoteiroLigacao(ctx, parsed.data.tipo)
      : gerarAbordagemLib(ctx, parsed.data.tipo);

    const abordagem = await prisma.abordagem.create({
      data: {
        user_id: userId,
        lead_id: lead.id,
        canal: parsed.data.canal,
        assunto: null,
        conteudo: mensagem,
        enviado: false,
      },
    });

    revalidatePath("/leads");
    revalidatePath(`/leads/${lead.id}`);

    return {
      kind: "ok",
      canal: parsed.data.canal,
      mensagem,
      // F038 AC4 — roteiro é pra falar. Pré-preencher o WhatsApp com ele seria
      // a ação errada oferecida com destaque.
      waLink: ehLigacao ? null : linkWhatsapp(lead.telefone, mensagem),
      abordagemId: abordagem.id,
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
