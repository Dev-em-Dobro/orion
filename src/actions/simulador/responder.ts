"use server";

// F013 — uma rodada do Simulador de Venda. Spec: F013-simulador-de-venda.md.

import { createLlmForUser } from "@/lib/llm";
import { estornarCota, reservarCota } from "@/lib/limites";
import { consumirMensal, verificarLimiteMensal } from "@/lib/planos";
import { entradaSchema } from "@/lib/simulador/validacao";
import { simularTurno, SimuladorError } from "@/lib/simulador/simular";
import { assinarFalaDono } from "@/lib/simulador/assinatura";
import { CenarioInvalidoError } from "@/lib/simulador/cenario";
import { conferirHistorico, resolverCenario } from "@/lib/simulador/entrada";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";

export type ResponderTurnoResult =
  | { ok: true; mensagem: string; assinatura: string }
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

  const ultimo = parsed.data.historico[parsed.data.historico.length - 1];
  if (!ultimo || ultimo.papel !== "aluno") {
    return { ok: false, erro: "Aguardando a fala do treinando" };
  }

  // O cenário vem do banco e as falas da persona são conferidas **antes** de
  // reservar cota ou chamar a IA: pedido adulterado não custa nada.
  let cenario, historico;
  try {
    cenario = await resolverCenario(userId, parsed.data.cenario);
    historico = conferirHistorico(userId, parsed.data.historico);
  } catch (e) {
    if (e instanceof CenarioInvalidoError) return { ok: false, erro: e.message };
    throw e;
  }

  let reservou = false;
  try {
    // F035 — teto mensal do plano antes da cota diária e de qualquer
    // chamada de IA: no limite, nada é gasto.
    await verificarLimiteMensal(userId, "simulador_msg");
    await reservarCota(userId, "simulador_msg");
    reservou = true;
    const llm = await createLlmForUser(userId);
    const { mensagem } = await simularTurno(cenario, historico, llm);
    await consumirMensal(userId, "simulador_msg");
    // A assinatura volta junto: é ela que deixa esta fala ser reenviada como
    // histórico no próximo turno.
    return { ok: true, mensagem, assinatura: assinarFalaDono(userId, mensagem) };
  } catch (e) {
    if (reservou) {
      await estornarCota(userId, "simulador_msg").catch(() => undefined);
    }
    const escopo = mensagemEscopo(e);
    if (escopo) return { ok: false, erro: escopo };
    if (e instanceof SimuladorError) return { ok: false, erro: e.message };
    return { ok: false, erro: "Falha na simulação. Tente novamente." };
  }
}
