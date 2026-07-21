// F013 — Scorecard via LlmClient (F017 / ADR-011).

import { z } from "zod";
import type { LlmClient } from "@/lib/llm";
import { LlmError } from "@/lib/llm";
import {
  SYSTEM_PROMPT_AVALIACAO,
  montarTranscript,
  type Cenario,
  type Turno,
} from "./prompt";
import { SimuladorError } from "./simular";

export type Competencia = { nome: string; nota: number; comentario: string };

export type Scorecard = {
  competencias: Competencia[];
  nota_geral: number;
  pontos_fortes: string[];
  o_que_melhorar: string[];
};

const schema = z.object({
  competencias: z.array(
    z.object({
      nome: z.string(),
      nota: z.number(),
      comentario: z.string(),
    }),
  ),
  nota_geral: z.number(),
  pontos_fortes: z.array(z.string()),
  o_que_melhorar: z.array(z.string()),
});

export async function avaliarSimulacao(
  cenario: Cenario,
  historico: Turno[],
  llm: LlmClient,
): Promise<Scorecard> {
  try {
    return await llm.generateStructured({
      system: SYSTEM_PROMPT_AVALIACAO,
      prompt: montarTranscript(cenario, historico),
      schema,
      tier: "strong",
      maxTokens: 1500,
    });
  } catch (e) {
    if (e instanceof SimuladorError) throw e;
    if (e instanceof LlmError) {
      throw new SimuladorError(e.status, e.message);
    }
    throw e;
  }
}
