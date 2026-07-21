// F008 — Diagnóstico UX via LlmClient (visão) — F017 / ADR-011.

import { z } from "zod";
import type { Severidade } from "@prisma/client";
import type { LlmClient } from "@/lib/llm";
import { LlmError } from "@/lib/llm";

export class AnaliseUxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnaliseUxError";
  }
}

export type ProblemaUx = {
  titulo: string;
  severidade: Severidade;
  detalhe: string;
};

export type AnaliseUx = {
  resumo: string;
  problemas: ProblemaUx[];
  pontos_positivos: string[];
};

export type ContextoAnalise = {
  nome: string;
  categoria: string;
  desktopB64: string;
  mobileB64: string;
};

const schema = z.object({
  resumo: z.string(),
  problemas: z.array(
    z.object({
      titulo: z.string(),
      severidade: z.enum(["ALTA", "MEDIA", "BAIXA"]),
      detalhe: z.string(),
    }),
  ),
  pontos_positivos: z.array(z.string()),
});

const SYSTEM = `Você é um consultor sênior de UX/UI avaliando o site de um estabelecimento local. A primeira imagem é o site em desktop (1280×800) e a segunda em mobile (390×844) — apenas a dobra inicial de cada um.

Sua análise vira um diagnóstico gratuito enviado ao dono do negócio. Regras:
- Reporte APENAS o que está visível nos screenshots. Nunca invente nada.
- Linguagem simples de dono de negócio, sem jargão técnico.
- Foco em conversão: o visitante entende na hora o que o negócio faz? Encontra contato/WhatsApp fácil? O site transmite confiança e profissionalismo? A versão mobile funciona bem?
- "resumo": 2–3 frases com a impressão geral.
- "problemas": 3 a 6, ordenados da maior pra menor severidade.
- "pontos_positivos": até 3, sinceros (lista vazia se não houver).`;

export async function analisarUx(
  ctx: ContextoAnalise,
  llm: LlmClient,
): Promise<AnaliseUx> {
  try {
    return await llm.generateVisionStructured({
      system: SYSTEM,
      prompt: `Estabelecimento: ${ctx.nome} (${ctx.categoria}). Analise o site nos dois screenshots.`,
      images: [
        { mediaType: "image/jpeg", dataBase64: ctx.desktopB64 },
        { mediaType: "image/jpeg", dataBase64: ctx.mobileB64 },
      ],
      schema,
      tier: "fast",
      maxTokens: 2048,
    });
  } catch (e) {
    if (e instanceof AnaliseUxError) throw e;
    if (e instanceof LlmError) {
      throw new AnaliseUxError(e.message);
    }
    throw e;
  }
}
