// F005/F006/F038 — montagem da Abordagem a partir dos pools de `frases.ts`.
// Spec: F005-abordagem-whatsapp.md ("Emenda 2026-08-16 — a Abordagem sai da IA")
//
// Puro: sem Next, sem Prisma (só os tipos do enum), sem I/O, sem relógio e
// **sem `Math.random()`** — a variação vem do `lead_id`, não do acaso. Isso é o
// que torna a mensagem reproduzível: o aluno reabre o Lead e vê o mesmo texto
// que copiou ontem.

import type { Severidade, TipoDor } from "@prisma/client";
import { dorPrincipal } from "../dores/principal";
import {
  ABERTURAS,
  CTAS,
  CTAS_FALADOS,
  FECHOS_FOLLOWUP,
  GANCHOS_FOLLOWUP,
  OBSERVACOES_FALADAS,
  PAUSA,
  PONTES,
  PONTES_FALADAS,
  RETOMADAS,
  RETOMADA_FALADA,
  SAUDACAO_FALADA,
  type ChaveAbertura,
} from "./frases";

export type TipoAbordagem = "primeira" | "followup";

/** A Dor como ela sai tanto do Prisma quanto de `detectarDores` (F004). */
export type DorDoLead = {
  tipo: TipoDor;
  severidade: Severidade;
  detalhes: string;
};

export type ContextoLead = {
  nome: string;
  categoria: string;
  endereco: string;
  dores: readonly DorDoLead[];
  /**
   * F038 — site de amostra já publicado pra este Lead. Entra **só** na mensagem
   * escrita: no roteiro falado a URL é proibida, porque ninguém soletra
   * endereço de site no telefone (F038 AC3).
   */
  demoUrl?: string | null;
  /**
   * Semente da rotação de variantes — o `lead_id`. Dois alunos prospectando o
   * mesmo negócio têm Leads diferentes, logo sorteiam independentemente.
   */
  seed: string;
};

/**
 * FNV-1a. Escolhido por ser curto, estável entre execuções e sem dependência —
 * não é hash criptográfico e não precisa ser: o que se pede dele é espalhar
 * cuids parecidos em índices diferentes.
 */
function hash(texto: string): number {
  let h = 2166136261;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Índice determinístico de um slot. O `slot` entra no hash (e não como
 * deslocamento do índice) pra que os slots variem de forma **independente**:
 * com deslocamento, dois Leads vizinhos andariam juntos em todos os slots e o
 * espaço de 36 mensagens desabaria pra 4.
 */
function escolher<T>(pool: readonly T[], seed: string, slot: string): T {
  return pool[hash(`${seed}:${slot}`) % pool.length]!;
}

/** A Dor que abre a mensagem: a de maior severidade, ou `SEM_DOR`. */
export function chaveDaDor(dores: readonly DorDoLead[]): ChaveAbertura {
  return dorPrincipal(dores)?.tipo ?? "SEM_DOR";
}

/** Conta palavras — o que as ACs de brevidade medem (F005 AC13). */
export function contarPalavras(texto: string): number {
  return texto.split(/\s+/).filter((p) => p.length > 0).length;
}

function comNegocio(frase: string, nome: string): string {
  return frase.replaceAll("{negocio}", nome);
}

/**
 * Mensagem escrita de WhatsApp — primeira ou follow-up.
 *
 * A URL do demo entra em linha própria no fim e **crua** (F038 AC16 / F005
 * AC16): reescrever link é a forma mais fácil de entregar um link quebrado.
 */
export function montarAbordagem(
  ctx: ContextoLead,
  tipo: TipoAbordagem = "primeira",
): string {
  const chave = chaveDaDor(ctx.dores);
  const partes =
    tipo === "followup"
      ? [
          comNegocio(escolher(RETOMADAS, ctx.seed, "retomada"), ctx.nome),
          GANCHOS_FOLLOWUP[chave],
          escolher(FECHOS_FOLLOWUP, ctx.seed, "fecho"),
        ]
      : [
          comNegocio(escolher(ABERTURAS[chave], ctx.seed, "abertura"), ctx.nome),
          escolher(PONTES, ctx.seed, "ponte"),
          escolher(CTAS, ctx.seed, "cta"),
        ];

  const texto = partes.join(" ");
  return ctx.demoUrl ? `${texto}\n\n${ctx.demoUrl}` : texto;
}

/**
 * F038 — roteiro falado. Sai com as pausas marcadas, porque quem lê é o aluno:
 * o marcador existe pra ele respirar antes do pedido, que é onde o iniciante
 * atropela.
 *
 * Sem URL, sem rubrica de teatro, sem nada que não seja pra dizer em voz alta.
 */
export function montarRoteiro(
  ctx: ContextoLead,
  tipo: TipoAbordagem = "primeira",
): string {
  const chave = chaveDaDor(ctx.dores);

  if (tipo === "followup") {
    return [
      RETOMADA_FALADA,
      PAUSA,
      GANCHOS_FOLLOWUP[chave],
      escolher(CTAS_FALADOS, ctx.seed, "cta-falado-followup"),
    ].join("\n");
  }

  return [
    SAUDACAO_FALADA,
    PAUSA,
    // "em", não "no": ver a regra de artigo em `frases.ts`.
    `Olha, eu dei uma olhada em ${ctx.nome} e ${escolher(
      OBSERVACOES_FALADAS[chave],
      ctx.seed,
      "observacao-falada",
    )}`,
    PAUSA,
    escolher(PONTES_FALADAS, ctx.seed, "ponte-falada"),
    PAUSA,
    escolher(CTAS_FALADOS, ctx.seed, "cta-falado"),
  ].join("\n");
}
