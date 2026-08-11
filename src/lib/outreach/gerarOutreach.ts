// F005/F006 — Geração da Outreach via LlmClient (F017 / ADR-011).

import { z } from "zod";
import type { LlmClient } from "@/lib/llm";
import { LlmError } from "@/lib/llm";
import {
  systemPrompt,
  montarContexto,
  type ContextoLead,
  type TipoOutreach,
} from "./prompt";
import { removerEmojis } from "./removerEmojis";
import { systemPromptEmail } from "./prompt-email";

export class OutreachError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "OutreachError";
  }
}

const schema = z.object({ mensagem: z.string() });
const schemaEmail = z.object({ assunto: z.string(), corpo: z.string() });

/** Gera a mensagem de Outreach de WhatsApp para um Lead. */
export async function gerarOutreach(
  ctx: ContextoLead,
  llm: LlmClient,
  tipo: TipoOutreach = "primeira",
): Promise<{ mensagem: string }> {
  try {
    const out = await llm.generateStructured({
      system: systemPrompt(tipo),
      prompt: montarContexto(ctx),
      schema,
      tier: "strong",
      maxTokens: 1024,
    });
    return { mensagem: removerEmojis(out.mensagem.trim()) };
  } catch (e) {
    if (e instanceof OutreachError) throw e;
    if (e instanceof LlmError) {
      throw new OutreachError(e.status, e.message);
    }
    throw e;
  }
}

/**
 * F027 — versão e-mail: mesma disciplina de tom, saída em dois campos.
 * O assunto é o que decide se o e-mail é aberto, então vem do modelo junto com
 * o corpo, olhando a mesma Dor.
 */
export async function gerarOutreachEmail(
  ctx: ContextoLead,
  llm: LlmClient,
  tipo: TipoOutreach = "primeira",
): Promise<{ assunto: string; corpo: string }> {
  try {
    const out = await llm.generateStructured({
      system: systemPromptEmail(tipo),
      prompt: montarContexto(ctx),
      schema: schemaEmail,
      tier: "strong",
      maxTokens: 1536,
    });
    return {
      assunto: removerEmojis(out.assunto.trim()),
      corpo: removerEmojis(out.corpo.trim()),
    };
  } catch (e) {
    if (e instanceof OutreachError) throw e;
    if (e instanceof LlmError) throw new OutreachError(e.status, e.message);
    throw e;
  }
}
