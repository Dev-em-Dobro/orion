// F026 — sinal de atendimento automatizado, inferido do site público do Lead.
// Spec: /specs/02-features/F026-sinal-atendimento-automatizado.md
// Fronteira da leitura: ADR-016.
//
// O que este módulo NÃO faz: mandar mensagem para o WhatsApp do Lead pra testar
// resposta automática. Seria disparo não solicitado (LGPD) e uso indevido da
// plataforma. Por isso `nao_detectado` significa "não encontramos sinal", nunca
// "não tem" — um bot pode rodar só dentro do WhatsApp, sem vestígio no site.
//
// Puro: sem rede, sem Prisma, sem Next.

import type { AtendimentoAutomatizado } from "@prisma/client";

export type SinalAtendimento = {
  classificacao: AtendimentoAutomatizado;
  /** O que sustentou a classificação. Sem evidência não há classificação. */
  evidencia: string | null;
};

/**
 * Plataformas de chatbot / atendimento. Dado, não lógica: crescer a lista não
 * muda o algoritmo. O rótulo vira a evidência mostrada ao aluno.
 */
const FORTES: { marca: string; padroes: string[] }[] = [
  { marca: "ManyChat", padroes: ["manychat.com", "mccdn.me"] },
  { marca: "BotConversa", padroes: ["botconversa.com.br"] },
  { marca: "Take Blip", padroes: ["blip.ai", "builder.blip.ai", "mdn.blip.ai"] },
  { marca: "Zenvia", padroes: ["zenvia.com"] },
  { marca: "Huggy", padroes: ["huggy.chat", "huggy.io"] },
  { marca: "Octadesk", padroes: ["octadesk.com", "octadesk.services"] },
  { marca: "Poli", padroes: ["meupoli.com.br", "polichat.com.br"] },
  { marca: "Kommo", padroes: ["kommo.com", "amocrm.com"] },
  { marca: "Leadster", padroes: ["leadster.com.br"] },
  { marca: "JivoChat", padroes: ["jivosite.com", "jivochat.com"] },
  { marca: "Tawk.to", padroes: ["tawk.to"] },
  { marca: "Tidio", padroes: ["tidio.co", "tidiochat.com"] },
  { marca: "Crisp", padroes: ["crisp.chat"] },
  { marca: "Chatvolt", padroes: ["chatvolt.ai"] },
  { marca: "ChatGuru", padroes: ["chatguru.com.br"] },
  { marca: "Chatwoot", padroes: ["chatwoot.com"] },
  { marca: "Z-API", padroes: ["z-api.io"] },
  { marca: "Evolution API", padroes: ["evolution-api.com"] },
  { marca: "360dialog", padroes: ["360dialog.com"] },
  { marca: "Respond.io", padroes: ["respond.io"] },
  { marca: "Wati", padroes: ["wati.io"] },
  { marca: "RD Station Conversas", padroes: ["rdstation.com.br/conversas"] },
  { marca: "Zendesk Chat", padroes: ["zopim.com", "zdassets.com"] },
  { marca: "Freshchat", padroes: ["freshchat.com", "wchat.freshchat.com"] },
  { marca: "Twilio", padroes: ["twilio.com"] },
  { marca: "Dialogflow", padroes: ["dialogflow.com", "dialogflow.cloud"] },
  { marca: "Botpress", padroes: ["botpress.cloud", "botpress.com"] },
];

/** Termos que sugerem automação sem provar. */
const TERMOS_FRACOS = [
  "atendimento automático",
  "atendimento automatico",
  "assistente virtual",
  "chatbot",
  "chat bot",
  "bot de atendimento",
  "resposta automática",
  "resposta automatica",
  "atendimento 24h",
  "atendimento 24 horas",
];

/** Container de chat genérico, sem vendor identificável. */
const WIDGETS_GENERICOS = [
  "chat-widget",
  "chat-bubble",
  "chatwidget",
  "widget-chat",
];

const WA_COM_TEXTO =
  /(?:wa\.me|api\.whatsapp\.com\/send)[^"'\s<>]*[?&]text=/i;

/** Teto de leitura — HTML maior que isso não é avaliado (ADR-016). */
export const HTML_MAX_BYTES = 1_000_000;

/**
 * Classifica o sinal a partir do HTML da home do Lead.
 *
 * `html = null` (sem site, agregador, site fora do ar, resposta não-HTML ou
 * grande demais) → `nao_avaliado`. É diferente de `nao_detectado`: um diz
 * "não dava pra olhar", o outro diz "olhamos e não achamos".
 */
export function detectarAtendimento(html: string | null): SinalAtendimento {
  if (html === null || html.length === 0) {
    return { classificacao: "nao_avaliado", evidencia: null };
  }

  const minusculo = html.toLowerCase();

  for (const { marca, padroes } of FORTES) {
    if (padroes.some((p) => minusculo.includes(p))) {
      return { classificacao: "detectado", evidencia: `widget ${marca}` };
    }
  }

  if (WA_COM_TEXTO.test(html)) {
    return {
      classificacao: "indicios",
      evidencia: "link wa.me com mensagem pré-preenchida",
    };
  }

  const termo = TERMOS_FRACOS.find((t) => minusculo.includes(t));
  if (termo) {
    return { classificacao: "indicios", evidencia: `texto "${termo}" no site` };
  }

  if (WIDGETS_GENERICOS.some((w) => minusculo.includes(w))) {
    return {
      classificacao: "indicios",
      evidencia: "widget de chat sem plataforma identificada",
    };
  }

  return {
    classificacao: "nao_detectado",
    evidencia: "nenhum widget de chat encontrado no site",
  };
}

/** Texto curto pra UI — sempre com o método, nunca afirmando ausência. */
export const ROTULO_ATENDIMENTO: Record<AtendimentoAutomatizado, string> = {
  detectado: "detectado",
  indicios: "indícios",
  nao_detectado: "não detectado",
  nao_avaliado: "não avaliado",
};
