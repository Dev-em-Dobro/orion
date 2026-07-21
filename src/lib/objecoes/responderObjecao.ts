// F011 — Objeções via LlmClient (F017 / ADR-011).

import { z } from "zod";
import type { LlmClient } from "@/lib/llm";
import { LlmError } from "@/lib/llm";
import {
  SYSTEM_PROMPT_OBJECOES,
  montarContextoObjecao,
  type ContextoObjecao,
} from "./prompt";

export class ObjecaoError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ObjecaoError";
  }
}

export type RespostaObjecao = { abordagem: string; texto: string };

const schema = z.object({
  respostas: z.array(
    z.object({
      abordagem: z.string(),
      texto: z.string(),
    }),
  ),
});

export async function responderObjecao(
  ctx: ContextoObjecao,
  llm: LlmClient,
): Promise<{ respostas: RespostaObjecao[] }> {
  try {
    return await llm.generateStructured({
      system: SYSTEM_PROMPT_OBJECOES,
      prompt: montarContextoObjecao(ctx),
      schema,
      tier: "strong",
      maxTokens: 1024,
    });
  } catch (e) {
    if (e instanceof ObjecaoError) throw e;
    if (e instanceof LlmError) {
      throw new ObjecaoError(e.status, e.message);
    }
    throw e;
  }
}
