// F005/F006 — Geração da Abordagem via LlmClient (F017 / ADR-011).

import { z } from "zod";
import type { LlmClient } from "@/lib/llm";
import { LlmError } from "@/lib/llm";
import {
  systemPrompt,
  montarContexto,
  type ContextoLead,
  type TipoAbordagem,
} from "./prompt";
import { removerEmojis } from "./removerEmojis";
import { systemPromptLigacao } from "./prompt-ligacao";

export class AbordagemError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "AbordagemError";
  }
}

const schema = z.object({ mensagem: z.string() });

/** Gera a mensagem de Abordagem de WhatsApp para um Lead. */
export async function gerarAbordagem(
  ctx: ContextoLead,
  llm: LlmClient,
  tipo: TipoAbordagem = "primeira",
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
    if (e instanceof AbordagemError) throw e;
    if (e instanceof LlmError) {
      throw new AbordagemError(e.status, e.message);
    }
    throw e;
  }
}

/**
 * F038 — roteiro falado (ligação ou áudio de WhatsApp).
 *
 * Mesmo contexto e mesma saída de um campo da F005: o que muda é o system
 * prompt, porque o texto vai ser **dito**, não enviado. Quem grava o resultado
 * usa `canal = "ligacao"` — e a UI não oferece `wa.me` pra ele.
 */
export async function gerarRoteiroLigacao(
  ctx: ContextoLead,
  llm: LlmClient,
  tipo: TipoAbordagem = "primeira",
): Promise<{ mensagem: string }> {
  try {
    const out = await llm.generateStructured({
      system: systemPromptLigacao(tipo),
      prompt: montarContexto(ctx),
      schema,
      tier: "strong",
      maxTokens: 1024,
    });
    return { mensagem: removerEmojis(out.mensagem.trim()) };
  } catch (e) {
    if (e instanceof AbordagemError) throw e;
    if (e instanceof LlmError) throw new AbordagemError(e.status, e.message);
    throw e;
  }
}
