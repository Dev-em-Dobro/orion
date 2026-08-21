// F012 — montagem da Proposta em código.
// Spec: F012-gerador-de-proposta.md ("Emenda 2026-08-16 (fim do dia)")
//
// Puro: sem Next, sem Prisma (só os tipos do enum), sem I/O e sem relógio.
//
// **O preço não entra aqui, e isso é estrutural.** Este módulo não recebe
// `valor`, `mensal` nem `prazo` — não é uma regra que ele obedece, é um dado
// que ele não tem. A F012 pedia isso à IA como instrução de prompt ("NUNCA cite
// preço"); agora não há como desobedecer (AC34).

import type { Severidade, TipoDor } from "@prisma/client";
import { dorPrincipal } from "../dores/principal";
import { item, type ItemId } from "./catalogo";

/** Mesma forma que a Dor tem no Prisma e em `detectarDores` (F004). */
export type DorDoLead = {
  tipo: TipoDor;
  severidade: Severidade;
  detalhes: string;
};

export type ContextoProposta = {
  nome: string;
  categoria: string;
  dores: readonly DorDoLead[];
  /** Itens marcados, já na ordem do catálogo (`itensOrdenados`). */
  itens: readonly ItemId[];
};

export type EscopoItem = { item: string; descricao: string };

export type PropostaTexto = {
  resumo: string;
  escopo: EscopoItem[];
  entregaveis: string[];
  observacoes: string;
};

type ChaveDor = TipoDor | "SEM_DOR";

/**
 * A primeira frase do resumo: onde o negócio está hoje, na língua do dono.
 *
 * Sem Dor detectada a proposta **não inventa problema** (AC33) — troca o
 * diagnóstico por uma leitura honesta de que a base já funciona. É a mesma
 * disciplina que o prompt antigo pedia, agora garantida pela tabela.
 *
 * `{negocio}` nunca vem com artigo — "a Padaria", "o Salão": o gênero é
 * imprevisível e artigo fixo erra em metade dos Leads. Mesma regra da
 * Abordagem, e o mesmo teste guarda as duas.
 */
const ABERTURA_RESUMO: Record<ChaveDor, string> = {
  SEM_SITE:
    "Hoje quem procura {negocio} na internet não encontra um site próprio de vocês — encontra, no máximo, o cadastro do Google.",
  SITE_AGREGADOR:
    "Hoje a presença de {negocio} na internet para na rede social: quem procura não chega a um site de vocês.",
  SITE_LENTO:
    "O site de {negocio} está no ar, mas demora pra abrir no celular — que é de onde vem a maior parte de quem procura.",
  SEM_HTTPS:
    "O site de {negocio} está no ar, mas aparece para o visitante como uma conexão não segura.",
  SEM_RESPOSTA_REVIEWS:
    "{negocio} tem avaliações no Google esperando resposta, e elas são a primeira coisa que um cliente novo lê.",
  SEM_ATENDIMENTO_AUTOMATIZADO:
    "Hoje todo primeiro contato com {negocio} depende de alguém estar disponível para responder.",
  SEM_DOR:
    "{negocio} já tem uma base digital funcionando; o que falta é ela trabalhar a favor de captar e atender cliente.",
};

const FECHO_RESUMO =
  "Abaixo está o que entra, item a item, e por que cada coisa está aí.";

/**
 * O que fica combinado depois do aceite. Fixo de propósito: é a única parte da
 * proposta que não varia com o negócio, porque o próximo passo é sempre o
 * mesmo. Não cita valor nem prazo — os dois já têm bloco próprio na folha.
 */
const OBSERVACOES =
  "Qualquer item pode entrar ou sair antes de começarmos — é só me dizer o que faz sentido. Confirmando por aqui, eu já dou início.";

function chaveDaDor(dores: readonly DorDoLead[]): ChaveDor {
  return dorPrincipal(dores)?.tipo ?? "SEM_DOR";
}

/**
 * Monta o texto da Proposta.
 *
 * Determinístico (AC31): a mesma seleção no mesmo Lead devolve exatamente o
 * mesmo objeto. Não há semente nem rotação de variantes aqui, ao contrário da
 * Abordagem — uma proposta vai para **um** cliente, depois de uma conversa, e
 * variar o texto entre duas propostas não compra nada.
 */
export function montarProposta(ctx: ContextoProposta): PropostaTexto {
  const resumo = `${ABERTURA_RESUMO[chaveDaDor(ctx.dores)].replaceAll(
    "{negocio}",
    ctx.nome,
  )} ${FECHO_RESUMO}`;

  const escopo = ctx.itens.map((id) => {
    const i = item(id);
    return { item: i.titulo, descricao: `${i.inclui} ${i.porque}` };
  });

  // União sem repetir (AC35): "Layout que funciona bem no celular" está na
  // landing e no site institucional, e ninguém quer ler duas vezes.
  const entregaveis = [
    ...new Set(ctx.itens.flatMap((id) => item(id).entregaveis)),
  ];

  return { resumo, escopo, entregaveis, observacoes: OBSERVACOES };
}
