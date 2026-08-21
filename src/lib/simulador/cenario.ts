// F013 — o Cenário é derivado no servidor, nunca recebido pronto.
// Spec: /specs/02-features/F013-simulador-de-venda.md (emenda de 2026-08-14)
//
// Antes o client montava `{ categoria, dores[], dificuldade }` e a action
// interpolava isso no system prompt. Quem monta o system prompt manda no
// modelo — então quem monta o system prompt tem que ser o servidor.

import { prisma } from "@/lib/db";
import { detectarDores, textosDasDores } from "@/lib/dores";
import { MAX_CATEGORIA } from "./constantes";
import type { Cenario, Dificuldade } from "./prompt";

export class CenarioInvalidoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CenarioInvalidoError";
  }
}

/**
 * Sanea a categoria digitada à mão — o único texto do aluno que ainda entra no
 * system prompt.
 *
 * Allowlist, não blocklist: sobram letras (com acento), dígitos, espaço e os
 * poucos separadores que aparecem em nome de ramo ("bar & restaurante",
 * "clínica/consultório"). Fora isso — quebra de linha, dois-pontos, colchete,
 * aspa, cerquilha — nada. É o alfabeto de "dentista", não o de uma instrução.
 */
export function sanitizarCategoria(bruto: string): string {
  return bruto
    .normalize("NFC")
    .replace(/[^\p{L}\p{N} \-&/.]/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_CATEGORIA)
    .trim();
}

/**
 * Cenário a partir de um Lead do próprio aluno.
 *
 * O escopo por `user_id` (F015) é o que impede treinar com o Lead de outro —
 * e, de quebra, que um `lead_id` chutado vire canal de leitura do banco alheio.
 */
export async function cenarioDoLead(
  userId: string,
  leadId: string,
  dificuldade: Dificuldade,
): Promise<Cenario> {
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, user_id: userId },
    include: {
      diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 },
      dores: true,
    },
  });
  if (!lead) throw new CenarioInvalidoError("Lead não encontrado");

  const diag = lead.diagnosticos[0];
  if (!diag) {
    throw new CenarioInvalidoError("Esse Lead ainda não tem Diagnóstico");
  }

  const dores =
    lead.dores.length > 0
      ? textosDasDores(lead.dores)
      : textosDasDores(detectarDores(diag, lead.website));

  return { categoria: lead.categoria, dores, dificuldade };
}

/** Cenário digitado à mão: categoria saneada, sem Dores. */
export function cenarioManual(
  categoriaBruta: string,
  dificuldade: Dificuldade,
): Cenario {
  const categoria = sanitizarCategoria(categoriaBruta);
  if (categoria.length < 2) {
    throw new CenarioInvalidoError("Informe a categoria do negócio");
  }
  return { categoria, dores: [], dificuldade };
}
