import type { Lead, Abordagem, Prisma } from "@prisma/client";

// F006 — fila de follow-up: contatados há +N dias desde o último envio.
export const FOLLOWUP_DIAS = 3;

const UM_DIA_MS = 86_400_000;

/**
 * Instante-limite da janela: uma Abordagem enviada **depois** disso ainda está
 * dentro do prazo, então o Lead não deve ser cobrado.
 */
export function limiteDaJanela(agora: number = Date.now()): Date {
  return new Date(agora - FOLLOWUP_DIAS * UM_DIA_MS);
}

/**
 * F028 — filtro da fila **no banco**. Antes a página carregava todos os Leads
 * `contatado` do tenant (com as Abordagens enviadas) e filtrava em memória, o
 * que fazia `/leads` ficar mais lenta a cada Lead abordado.
 *
 * `some` + `none` em vez de só `some`: um Lead abordado há 10 dias que recebeu
 * follow-up **hoje** tem sim um envio antigo (casaria com `some`), mas está
 * dentro da janela e não pode aparecer. `none` garante que o envio **mais
 * recente** é anterior ao limite.
 */
export function whereFilaFollowUp(limite: Date): Prisma.LeadWhereInput {
  return {
    status: "contatado",
    abordagens: {
      some: { enviado: true },
      none: { enviado: true, enviado_em: { gt: limite } },
    },
  };
}

// Espera `abordagens` já filtrado (enviado = true, mais recente primeiro, take 1).
export function filaDeFollowUp<T extends Lead & { abordagens: Abordagem[] }>(
  leads: T[],
  agora: number = Date.now(),
): { lead: T; dias: number }[] {
  return leads.flatMap((lead) => {
    const ultimoEnvio = lead.abordagens[0]?.enviado_em;
    if (lead.status !== "contatado" || !ultimoEnvio) return [];
    const dias = Math.floor((agora - ultimoEnvio.getTime()) / UM_DIA_MS);
    return dias >= FOLLOWUP_DIAS ? [{ lead, dias }] : [];
  });
}
