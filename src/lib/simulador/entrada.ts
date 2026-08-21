// F013 — porta de entrada das duas actions do Simulador.
// Spec: /specs/02-features/F013-simulador-de-venda.md (emenda de 2026-08-14)
//
// Converte o que o client pediu no que o servidor aceita usar: cenário
// derivado do banco e histórico com as falas da persona conferidas.

import { falaDonoAutentica } from "./assinatura";
import {
  CenarioInvalidoError,
  cenarioDoLead,
  cenarioManual,
} from "./cenario";
import type { Cenario, Turno } from "./prompt";
import type { PedidoCenario } from "./validacao";

type TurnoRecebido = { papel: "aluno" | "dono"; texto: string; assinatura?: string };

/** Cenário conforme o banco (ou a categoria saneada) — nunca o que veio pronto. */
export async function resolverCenario(
  userId: string,
  pedido: PedidoCenario,
): Promise<Cenario> {
  if (pedido.origem === "lead") {
    return cenarioDoLead(userId, pedido.lead_id, pedido.dificuldade);
  }
  return cenarioManual(pedido.categoria, pedido.dificuldade);
}

/**
 * Confere o histórico e devolve os turnos limpos (sem assinatura) pro prompt.
 *
 * Duas regras. Toda fala do `dono` tem que ter sido produzida por este
 * servidor, pra este aluno — senão o client escreve a fala do assistente e o
 * roleplay vira o que ele quiser. E a conversa tem que alternar começando pelo
 * aluno, que é a única forma que o fluxo real produz; qualquer outra coisa é
 * histórico montado à mão.
 */
export function conferirHistorico(
  userId: string,
  historico: TurnoRecebido[],
): Turno[] {
  historico.forEach((t, i) => {
    const esperado = i % 2 === 0 ? "aluno" : "dono";
    if (t.papel !== esperado) {
      throw new CenarioInvalidoError("Histórico da conversa inconsistente");
    }
    if (t.papel === "dono" && !falaDonoAutentica(userId, t.texto, t.assinatura)) {
      throw new CenarioInvalidoError("Histórico da conversa inconsistente");
    }
  });

  return historico.map((t) => ({ papel: t.papel, texto: t.texto }));
}
