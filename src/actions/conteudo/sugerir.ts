"use server";

// F007 — Sugestões de Vídeo-Funil.
// Spec: /specs/02-features/F007-sugestoes-video-funil.md

import { z } from "zod";
import { createLlmForUser } from "@/lib/llm";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import { sugerirVideos, ConteudoError } from "@/lib/conteudo/sugerirVideos";
import type { IdeiaVideo } from "@/lib/conteudo/prompt";

const schema = z.object({
  tema: z
    .string()
    .trim()
    .min(2, "Tema precisa ter ao menos 2 caracteres")
    .max(120, "Tema muito longo"),
});

export type SugerirState =
  | { kind: "idle" }
  | { kind: "ok"; ideias: IdeiaVideo[] }
  | { kind: "erro"; mensagem: string };

export async function sugerirVideosAction(
  _prev: SugerirState,
  formData: FormData,
): Promise<SugerirState> {
  const parsed = schema.safeParse({ tema: formData.get("tema") });
  if (!parsed.success) {
    const primeiro = parsed.error.issues[0];
    return { kind: "erro", mensagem: primeiro?.message ?? "Input inválido" };
  }

  try {
    const { userId } = await requireTenant();
    const llm = await createLlmForUser(userId);
    const ideias = await sugerirVideos(parsed.data.tema, llm);
    return { kind: "ok", ideias };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    if (e instanceof ConteudoError) {
      return { kind: "erro", mensagem: e.message };
    }
    return { kind: "erro", mensagem: "Falha ao gerar ideias. Tente novamente." };
  }
}
