// F013 — turno do roleplay via LlmClient (F017 / ADR-011).

import type { LlmClient } from "@/lib/llm";
import { LlmError } from "@/lib/llm";
import { MAX_TURNOS } from "./constantes";
import { systemPromptPersona, type Cenario, type Turno } from "./prompt";

export class SimuladorError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "SimuladorError";
  }
}

export async function simularTurno(
  cenario: Cenario,
  historico: Turno[],
  llm: LlmClient,
): Promise<{ mensagem: string }> {
  const turnosAluno = historico.filter((t) => t.papel === "aluno").length;
  const encerrando = turnosAluno >= MAX_TURNOS;

  const messages = historico.map((t) => ({
    role: (t.papel === "aluno" ? "user" : "assistant") as "user" | "assistant",
    content: t.texto,
  }));

  try {
    const mensagem = await llm.generateText({
      system: systemPromptPersona(cenario, encerrando),
      messages,
      tier: "fast",
      maxTokens: 512,
    });
    return { mensagem };
  } catch (e) {
    if (e instanceof SimuladorError) throw e;
    if (e instanceof LlmError) {
      throw new SimuladorError(e.status, e.message);
    }
    throw e;
  }
}
