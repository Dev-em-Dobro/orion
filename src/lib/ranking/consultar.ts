// F037 — a **única** leitura cross-tenant do Orion.
// Spec: /specs/02-features/F037-ranking-de-builders.md
//
// Toda query do produto é escopada por `user_id` (invariante da F015, com teste
// de isolamento). Esta quebra isso por definição: o ranking mostra dado de um
// aluno para os outros.
//
// A cerca que torna isso aceitável:
//   1. Mora aqui, num arquivo com esse nome, FORA de `lib/db/scoped`. Não vira
//      helper genérico "sem escopo".
//   2. Devolve só posição, nome de exibição e nº de vendas. Nada que descreva
//      *quem* o aluno vendeu sai daqui (F037 AC8).
//   3. Só quem deu opt-in aparece nomeado.

import { prisma } from "@/lib/db";
import { competenciaDe, intervaloDaCompetencia } from "@/lib/planos/competencia";
import { calcularRanking, type Ranking, type VendasDoAluno } from "./calcular";

export { competenciaDe, intervaloDaCompetencia };

/**
 * Venda que conta (F037, "Antifraude"): Lead `ganho` na competência que teve
 * **trabalho real** — Diagnóstico executado e Abordagem marcada como enviada.
 *
 * Não impede fraude, encarece: pra inflar o número é preciso rodar o fluxo
 * inteiro e gastar cota de coleta e de diagnóstico. A conferência humana antes
 * do prêmio é a segunda camada, e é a que decide.
 */
function ondeVendaConta(inicio: Date, fim: Date) {
  return {
    status: "ganho" as const,
    status_em: { gte: inicio, lt: fim },
    diagnosticos: { some: {} },
    abordagens: { some: { enviado: true } },
  };
}

export async function rankingDoMes(
  userIdAtual: string,
  competencia: string = competenciaDe(new Date()),
  topN = 10,
): Promise<Ranking> {
  const { inicio, fim } = intervaloDaCompetencia(competencia);

  // Agregação no banco, não em memória: com 50 mil Leads o `findMany` cruzaria
  // a base inteira de todos os alunos pelo Node (F037 AC12).
  const porAluno = await prisma.lead.groupBy({
    by: ["user_id"],
    where: ondeVendaConta(inicio, fim),
    _count: { _all: true },
    _max: { status_em: true },
  });

  if (porAluno.length === 0) {
    return calcularRanking([], userIdAtual, topN);
  }

  const perfis = await prisma.perfilPublico.findMany({
    where: {
      user_id: { in: porAluno.map((l) => l.user_id) },
      ranking_optin: true,
    },
    select: { user_id: true, nome_exibicao: true },
  });
  const nomePorUser = new Map(perfis.map((p) => [p.user_id, p.nome_exibicao]));

  const linhas: VendasDoAluno[] = porAluno.map((l) => ({
    userId: l.user_id,
    vendas: l._count._all,
    ultimaEm: l._max.status_em ?? inicio,
    nomeExibicao: nomePorUser.get(l.user_id) ?? null,
  }));

  return calcularRanking(linhas, userIdAtual, topN);
}
