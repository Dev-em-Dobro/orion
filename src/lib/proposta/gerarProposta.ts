// F012 — Proposta via LlmClient (F017 / ADR-011).

import { z } from "zod";
import type { LlmClient } from "@/lib/llm";
import { LlmError } from "@/lib/llm";
import {
  SYSTEM_PROMPT_PROPOSTA,
  montarContextoProposta,
  type ContextoProposta,
} from "./prompt";

export class PropostaError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "PropostaError";
  }
}

export type EscopoItem = { item: string; descricao: string };

export type PropostaTexto = {
  resumo: string;
  escopo: EscopoItem[];
  entregaveis: string[];
  prazo_estimado: string;
  observacoes: string;
};

const schema = z.object({
  resumo: z.string(),
  escopo: z.array(
    z.object({
      item: z.string(),
      descricao: z.string(),
    }),
  ),
  entregaveis: z.array(z.string()),
  prazo_estimado: z.string(),
  observacoes: z.string(),
});

export async function gerarProposta(
  ctx: ContextoProposta,
  llm: LlmClient,
): Promise<PropostaTexto> {
  try {
    return await llm.generateStructured({
      system: SYSTEM_PROMPT_PROPOSTA,
      prompt: montarContextoProposta(ctx),
      schema,
      tier: "strong",
      maxTokens: 1500,
    });
  } catch (e) {
    if (e instanceof PropostaError) throw e;
    if (e instanceof LlmError) {
      throw new PropostaError(e.status, e.message);
    }
    throw e;
  }
}
