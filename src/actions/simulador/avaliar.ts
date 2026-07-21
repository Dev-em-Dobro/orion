"use server";

// F013 — avaliação final (Scorecard) do Simulador de Venda.

import { createLlmForUser } from "@/lib/llm";
import { entradaSchema } from "@/lib/simulador/validacao";
import { avaliarSimulacao } from "@/lib/simulador/avaliar";
import { SimuladorError } from "@/lib/simulador/simular";
import type { Scorecard } from "@/lib/simulador/avaliar";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";

export type AvaliarResult =
  | { ok: true; scorecard: Scorecard }
  | { ok: false; erro: string };

export async function avaliarSimulacaoAction(
  input: unknown,
): Promise<AvaliarResult> {
  let userId: string;
  try {
    ({ userId } = await requireTenant());
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { ok: false, erro: escopo };
    throw e;
  }

  const parsed = entradaSchema.safeParse(input);
  if (!parsed.success) return { ok: false, erro: "Input inválido" };

  const { cenario, historico } = parsed.data;
  const turnosAluno = historico.filter((t) => t.papel === "aluno").length;
  if (turnosAluno < 2) {
    return { ok: false, erro: "Converse um pouco antes de avaliar" };
  }

  try {
    const llm = await createLlmForUser(userId);
    const scorecard = await avaliarSimulacao(cenario, historico, llm);
    return { ok: true, scorecard };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { ok: false, erro: escopo };
    if (e instanceof SimuladorError) return { ok: false, erro: e.message };
    return { ok: false, erro: "Falha na avaliação. Tente novamente." };
  }
}
