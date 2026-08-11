// F031 — a consulta que alimenta o cálculo puro.
// Spec: /specs/02-features/F031-central-de-tarefas.md
//
// Uma rodada de queries (F028): Leads em estágio cobrável, adiamentos e a
// contagem da fila que espera aprofundamento.

import { prisma } from "@/lib/db";
import { SCORE_QUALIFICADO } from "@/lib/score/score";
import { calcularTarefas, type Tarefa } from "./calcular";

/** Só os estágios que podem gerar cobrança — o resto nem sai do banco. */
const ESTAGIOS_COBRAVEIS = [
  "priorizado",
  "contatado",
  "respondeu",
  "proposta",
] as const;

/** Teto de Outreaches lidas por Lead: só as mais recentes importam. */
const OUTREACHES_POR_LEAD = 5;

/**
 * Recebe o `userId` em vez de chamar `requireTenant()` por dentro: quem chama
 * já resolveu a sessão (as páginas) ou já tem o id na mão (as ferramentas do
 * Agente, F029). Sem isso, o módulo arrastava a auth inteira junto.
 */
export async function tarefasDoUsuario(
  userId: string,
  agora: number = Date.now(),
): Promise<Tarefa[]> {
  const whereUser = { user_id: userId };

  const [leads, adiamentos, aguardandoAprofundamento] = await Promise.all([
    prisma.lead.findMany({
      where: { ...whereUser, status: { in: [...ESTAGIOS_COBRAVEIS] } },
      select: {
        id: true,
        nome: true,
        status: true,
        status_em: true,
        score: true,
        telefone: true,
        outreaches: {
          select: { enviado: true, enviado_em: true, gerado_em: true },
          orderBy: { gerado_em: "desc" },
          take: OUTREACHES_POR_LEAD,
        },
      },
    }),
    prisma.tarefaAdiamento.findMany({
      where: whereUser,
      select: {
        lead_id: true,
        tipo: true,
        marco: true,
        adiada_ate: true,
        dispensada_em: true,
      },
    }),
    prisma.lead.count({
      where: {
        ...whereUser,
        status: "novo",
        score_estimado: true,
        score: { gte: SCORE_QUALIFICADO },
      },
    }),
  ]);

  return calcularTarefas(
    { leads, adiamentos, aguardandoAprofundamento },
    agora,
  );
}

/** Badge da sidebar: só o número de cobranças já vencidas. */
export async function contarTarefas(userId: string): Promise<number> {
  const tarefas = await tarefasDoUsuario(userId);
  return tarefas.filter((t) => t.faixa !== "hoje").length;
}
