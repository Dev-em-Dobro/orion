"use server";

// F013 — uma rodada do Simulador de Venda. Spec: F013-simulador-de-venda.md.

import { createLlmForUser } from "@/lib/llm";
import { entradaSchema } from "@/lib/simulador/validacao";
import { simularTurno, SimuladorError } from "@/lib/simulador/simular";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";

export type ResponderTurnoResult =
  | { ok: true; mensagem: string }
  | { ok: false; erro: string };

export async function responderTurnoAction(
  input: unknown,
): Promise<ResponderTurnoResult> {
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
  const ultimo = historico[historico.length - 1];
  if (!ultimo || ultimo.papel !== "aluno") {
    return { ok: false, erro: "Aguardando a fala do treinando" };
  }

  try {
    const llm = await createLlmForUser(userId);
    const { mensagem } = await simularTurno(cenario, historico, llm);
    return { ok: true, mensagem };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { ok: false, erro: escopo };
    if (e instanceof SimuladorError) return { ok: false, erro: e.message };
    return { ok: false, erro: "Falha na simulação. Tente novamente." };
  }
}
