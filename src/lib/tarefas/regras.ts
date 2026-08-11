// F031 — as regras da cobrança, em um lugar só.
// Spec: /specs/02-features/F031-central-de-tarefas.md
//
// Mudar um prazo aqui é mudar o produto → editar a spec antes.

import type { TipoTarefa } from "@prisma/client";

const HORA = 3_600_000;
const DIA = 86_400_000;

/** Prazo até a cobrança aparecer, contado a partir do marco. */
export const PRAZOS: Record<TipoTarefa, number> = {
  // O pedido que originou a feature: abordou e em 12h não marcou nada.
  CONFIRMAR_RESPOSTA: 12 * HORA,
  // Alinhado ao FOLLOWUP_DIAS da F006 — é a mesma janela.
  MANDAR_FOLLOWUP: 3 * DIA,
  ENVIAR_ABORDAGEM: 24 * HORA,
  AVANCAR_RESPONDEU: 2 * DIA,
  COBRAR_PROPOSTA: 3 * DIA,
  // Agregada: não tem prazo, existe enquanto houver fila pra aprofundar.
  APROFUNDAR_FILA: 0,
};

export const TITULO: Record<TipoTarefa, string> = {
  CONFIRMAR_RESPOSTA: "Ele respondeu?",
  MANDAR_FOLLOWUP: "Mande o follow-up",
  ENVIAR_ABORDAGEM: "Envie a abordagem",
  AVANCAR_RESPONDEU: "Qualifique ou mande proposta",
  COBRAR_PROPOSTA: "Cobre a decisão",
  APROFUNDAR_FILA: "Aprofunde os melhores da busca",
};

/** A regra em uma linha — a cobrança não pode parecer arbitrária. */
export const EXPLICACAO: Record<TipoTarefa, string> = {
  CONFIRMAR_RESPOSTA:
    "abordado há mais de 12h e ainda sem desfecho registrado",
  MANDAR_FOLLOWUP:
    "abordado há mais de 3 dias sem resposta — a maioria das respostas vem do 2º toque",
  ENVIAR_ABORDAGEM: "abordagem gerada há mais de 24h e ainda não enviada",
  AVANCAR_RESPONDEU: "respondeu há mais de 2 dias e o funil não andou",
  COBRAR_PROPOSTA: "proposta enviada há mais de 3 dias sem decisão",
  APROFUNDAR_FILA:
    "há Leads com potencial alto na triagem esperando diagnóstico",
};

export type FaixaUrgencia = "atrasada" | "vencida" | "hoje";

/** Atrasada = passou de 2× o prazo. É o que sobe pro topo da lista. */
export function faixaDe(atrasoMs: number, prazoMs: number): FaixaUrgencia {
  if (prazoMs > 0 && atrasoMs >= prazoMs) return "atrasada";
  if (atrasoMs >= 0) return "vencida";
  return "hoje";
}

export const ROTULO_FAIXA: Record<FaixaUrgencia, string> = {
  atrasada: "Atrasada",
  vencida: "Vencida",
  hoje: "Pra hoje",
};

/** Quanto tempo o "Adiar" empurra a cobrança. */
export const ADIAR_MS = DIA;
