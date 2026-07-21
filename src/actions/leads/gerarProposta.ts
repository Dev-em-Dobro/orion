"use server";

// F012 — Gerador de Proposta com preço sugerido.
// Spec: /specs/02-features/F012-gerador-de-proposta.md
// Gera a prosa (Claude) + a faixa de preço (determinística, precos.ts). NÃO muda
// status nem persiste: a promoção a `proposta` é o botão "Proposta" existente
// (registrarDesfecho, F006/F010).

import { createLlmForUser } from "@/lib/llm";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import { detectarDores, textosDasDores } from "@/lib/dores";
import { servicosRecomendados } from "@/lib/proposta/servicos";
import { precificar, type Precificacao } from "@/lib/proposta/precos";
import { formatarPropostaTexto } from "@/lib/proposta/formatar";
import {
  gerarProposta as gerarPropostaLib,
  PropostaError,
  type PropostaTexto,
} from "@/lib/proposta/gerarProposta";
import { prisma } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
});

export type GerarPropostaState =
  | { kind: "idle" }
  | {
      kind: "ok";
      proposta: PropostaTexto;
      precificacao: Precificacao;
      textoCopiavel: string;
    }
  | { kind: "erro"; mensagem: string };

export async function gerarPropostaAction(
  _prev: GerarPropostaState,
  formData: FormData,
): Promise<GerarPropostaState> {
  const parsed = schema.safeParse({ lead_id: formData.get("lead_id") });
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
        mensagem: "Diagnostique o Lead antes de gerar a Proposta",
      };
    }

    const dores =
      lead.dores.length > 0
        ? textosDasDores(lead.dores)
        : textosDasDores(detectarDores(diag, lead.website));
    const servicos = servicosRecomendados(diag);
    const precificacao = precificar({
      servicos,
      categoria: lead.categoria,
      num_avaliacoes: lead.num_avaliacoes,
    });

    let proposta: PropostaTexto;
    try {
      proposta = await gerarPropostaLib(
        {
          nome: lead.nome,
          categoria: lead.categoria,
          dores,
          servicos,
        },
        llm,
      );
    } catch (e) {
      if (e instanceof PropostaError) {
        return { kind: "erro", mensagem: e.message };
      }
      return {
        kind: "erro",
        mensagem: "Falha ao gerar a Proposta. Tente novamente.",
      };
    }

    return {
      kind: "ok",
      proposta,
      precificacao,
      textoCopiavel: formatarPropostaTexto(proposta, precificacao),
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
