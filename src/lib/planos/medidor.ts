// F035 — o medidor: "Lead diagnosticado no mês".
// Spec: /specs/02-features/F035-planos-e-limites.md
//
// Conta 1 quando um Lead recebe o **primeiro** Diagnóstico dentro da
// competência. Re-diagnosticar não conta de novo (o valor já foi entregue), e
// Diagnóstico manual conta igual ao lote — senão bastava clicar 200 vezes no
// botão pra furar o limite, com o mesmo custo de PageSpeed pra nós.

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { limiteMensal, type Plano } from "./catalogo";
import { competenciaDe } from "./competencia";
import { LimiteDoPlanoError } from "./erros";
import { planoDoUsuario, usuarioEmByok } from "./resolver";

export type UsoDoPlano = {
  plano: Plano;
  competencia: string;
  usado: number;
  limite: number;
  restante: number;
  /** Fração 0–1, saturada em 1. É o que a barra desenha. */
  fracao: number;
  byok: boolean;
};

/** Cliente Prisma ou transação — o incremento roda dentro da transação. */
type Db = Prisma.TransactionClient | typeof prisma;

export async function usoDoPlano(
  userId: string,
  agora: Date = new Date(),
): Promise<UsoDoPlano> {
  const competencia = competenciaDe(agora);
  const [plano, byok, linha] = await Promise.all([
    planoDoUsuario(userId),
    usuarioEmByok(userId),
    prisma.usoMensal.findUnique({
      where: { user_id_competencia: { user_id: userId, competencia } },
      select: { leads_diagnosticados: true },
    }),
  ]);

  const limite = limiteMensal(plano, byok);
  const usado = linha?.leads_diagnosticados ?? 0;
  return {
    plano,
    competencia,
    usado,
    limite,
    restante: Math.max(0, limite - usado),
    fracao: limite > 0 ? Math.min(1, usado / limite) : 1,
    byok,
  };
}

/**
 * Barra antes de gastar chave de API. Chamado no diagnóstico individual e a
 * cada item do lote — o lote para no limite sem perder o que já processou
 * (F035 AC4).
 */
export async function verificarLimiteMensal(
  userId: string,
  agora: Date = new Date(),
): Promise<void> {
  const uso = await usoDoPlano(userId, agora);
  if (uso.usado >= uso.limite) {
    throw new LimiteDoPlanoError(uso.plano, uso.usado, uso.limite);
  }
}

/**
 * Incrementa o medidor **dentro da transação** do Diagnóstico. Sem contador
 * fantasma: se o Diagnóstico falhar, o incremento morre junto.
 *
 * O `increment` do Prisma é atômico no banco, então dois lotes simultâneos
 * somam certo (AC12) — o teto ainda pode ser ultrapassado por 1 ou 2 numa
 * corrida, e isso é deliberado: preferimos entregar a mais do que travar uma
 * transação com lock pessimista.
 */
export async function contarLeadDiagnosticado(
  db: Db,
  userId: string,
  leadId: string,
  agora: Date = new Date(),
): Promise<boolean> {
  const anteriores = await db.diagnostico.count({
    where: { lead_id: leadId, user_id: userId },
  });
  if (anteriores > 0) return false;

  const competencia = competenciaDe(agora);
  await db.usoMensal.upsert({
    where: { user_id_competencia: { user_id: userId, competencia } },
    create: { user_id: userId, competencia, leads_diagnosticados: 1 },
    update: { leads_diagnosticados: { increment: 1 } },
  });
  return true;
}
