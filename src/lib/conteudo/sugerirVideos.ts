// F007 — Ideias de Vídeo via LlmClient (F017 / ADR-011).

import { z } from "zod";
import type { LlmClient } from "@/lib/llm";
import { LlmError } from "@/lib/llm";
import {
  SYSTEM_PROMPT_CONTEUDO,
  montarTema,
  type IdeiaVideo,
} from "./prompt";

export class ConteudoError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ConteudoError";
  }
}

const schema = z.object({
  ideias: z.array(
    z.object({
      titulo: z.string(),
      formato: z.string(),
      atrai: z.string(),
      etapa: z.enum(["topo", "meio", "fundo"]),
      cta: z.string(),
      roteiro: z.array(z.string()),
    }),
  ),
});

export async function sugerirVideos(
  tema: string,
  llm: LlmClient,
): Promise<IdeiaVideo[]> {
  try {
    const out = await llm.generateStructured({
      system: SYSTEM_PROMPT_CONTEUDO,
      prompt: montarTema(tema),
      schema,
      tier: "strong",
      maxTokens: 4096,
    });
    return out.ideias.map((i) => ({
      titulo: i.titulo,
      formato: i.formato,
      atrai: i.atrai,
      etapa: i.etapa,
      cta: i.cta,
      roteiro: i.roteiro,
    }));
  } catch (e) {
    if (e instanceof ConteudoError) throw e;
    if (e instanceof LlmError) {
      throw new ConteudoError(e.status, e.message);
    }
    throw e;
  }
}
