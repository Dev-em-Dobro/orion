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

/**
 * O que fazer, e por que isso importa — o texto do "i" ao lado do título.
 *
 * A `EXPLICACAO` acima diz por que a cobrança **apareceu** (a regra). Isso
 * responde "por que estou sendo cobrado" e deixa em branco "o que eu faço com
 * isso": "há Leads com potencial alto na triagem esperando diagnóstico" só
 * significa alguma coisa pra quem já sabe o que é triagem e o que muda depois
 * do Diagnóstico. Aqui o texto assume que a pessoa não sabe.
 */
export const O_QUE_FAZER: Record<TipoTarefa, string> = {
  CONFIRMAR_RESPOSTA:
    "Você abordou e não registrou o que aconteceu. Sem isso o funil trava: o Lead fica parado em Contatado e o Orion não sabe se cobra follow-up ou para de cobrar. Abra o Lead e marque o desfecho — respondeu, não respondeu ou perdido.",
  MANDAR_FOLLOWUP:
    "Passaram 3 dias da abordagem sem resposta. A maior parte das respostas vem do SEGUNDO toque, não do primeiro — parar no primeiro joga fora metade do trabalho já feito. O botão aqui gera o texto do follow-up pronto, puxando o que já foi dito.",
  ENVIAR_ABORDAGEM:
    "O Orion escreveu a abordagem e ela está parada há mais de um dia. Texto gerado e não enviado não vale nada, e o Diagnóstico que sustenta o argumento envelhece junto. Abra, revise e marque como enviada quando mandar.",
  AVANCAR_RESPONDEU:
    "Ele respondeu e o funil não andou desde então. Responder é o ponto mais quente da conversa; deixar esfriar dois dias costuma custar a venda. Decida o próximo passo: qualificar (tem fit, verba e intenção) ou já mandar proposta.",
  COBRAR_PROPOSTA:
    "A proposta foi enviada e ninguém decidiu. Proposta sem cobrança vira 'depois eu vejo' e morre em silêncio. Pergunte direto se é sim ou não — um não rápido devolve o seu tempo pro próximo Lead.",
  APROFUNDAR_FILA:
    "A busca trouxe Leads com score alto na Triagem, que é um chute a partir do que o Google devolveu: nicho, número de avaliações e se existe site. Aprofundar roda o Diagnóstico de verdade — abre o site, mede a velocidade, confere HTTPS e levanta as Dores. Só depois disso o score é confiável e o Lead entra na Fila do dia.",
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
