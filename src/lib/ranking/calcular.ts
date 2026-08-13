// F037 — ordenação, empate e posição do Ranking de Builders.
// Spec: /specs/02-features/F037-ranking-de-builders.md
//
// Puro: recebe as vendas já contadas e devolve o quadro. Sem Prisma e sem
// Next, então o desempate e o corte do top são testáveis com relógio fixo.

/** Uma linha crua vinda da consulta: quantas vendas e quando foi a última. */
export type VendasDoAluno = {
  userId: string;
  vendas: number;
  /** `status_em` da venda mais recente que conta. Desempate. */
  ultimaEm: Date;
  /** Nome público. `null` = não deu opt-in (F037 AC5). */
  nomeExibicao: string | null;
};

/**
 * O que sai daqui é **tudo** que a UI pode mostrar de outro aluno. Nunca
 * ganha campo de Lead, e-mail ou `userId` de terceiro (F037 AC8) — o `ehVoce`
 * é resolvido aqui dentro justamente pra o `userId` não precisar vazar.
 */
export type LinhaRanking = {
  posicao: number;
  nomeExibicao: string;
  vendas: number;
  ehVoce: boolean;
};

export type Ranking = {
  /** Top N de quem deu opt-in. */
  top: LinhaRanking[];
  /**
   * A linha do próprio aluno, mesmo fora do top e mesmo sem opt-in. Ranking
   * onde a pessoa não se acha não engaja (F037 AC10).
   */
  voce: LinhaRanking | null;
  /** Quantos alunos venderam no mês, contando quem não aparece nomeado. */
  participantes: number;
  /** Quantos venderam mas estão fora do opt-in — o convite pra entrar. */
  anonimos: number;
};

/**
 * Desempate: mais vendas primeiro; empatou, ganha quem **chegou antes** —
 * `ultimaEm` mais antigo. Explicável em uma frase ("vocês empataram em 3, ele
 * fechou a terceira antes") e estável entre execuções, que é o que impede o
 * pódio de dançar a cada refresh.
 */
function comparar(a: VendasDoAluno, b: VendasDoAluno): number {
  if (b.vendas !== a.vendas) return b.vendas - a.vendas;
  return a.ultimaEm.getTime() - b.ultimaEm.getTime();
}

export function calcularRanking(
  linhas: readonly VendasDoAluno[],
  userIdAtual: string,
  topN = 10,
): Ranking {
  const comVenda = linhas.filter((l) => l.vendas > 0);
  const ordenado = [...comVenda].sort(comparar);

  // A posição é contada **só entre quem deu opt-in**: quem está fora não pode
  // ocupar lugar, senão o pódio teria buracos e daria pra inferir que existe
  // alguém ali — que é exatamente o que o opt-in evita.
  const publicos = ordenado.filter((l) => l.nomeExibicao !== null);

  const top: LinhaRanking[] = publicos.slice(0, topN).map((l, i) => ({
    posicao: i + 1,
    nomeExibicao: l.nomeExibicao as string,
    vendas: l.vendas,
    ehVoce: l.userId === userIdAtual,
  }));

  const eu = ordenado.find((l) => l.userId === userIdAtual) ?? null;
  let voce: LinhaRanking | null = null;
  if (eu) {
    const indicePublico = publicos.findIndex((l) => l.userId === userIdAtual);
    voce = {
      // Sem opt-in não há posição pública: mostramos onde ele **estaria**,
      // contando entre os públicos + ele mesmo.
      posicao:
        indicePublico >= 0
          ? indicePublico + 1
          : publicos.filter((l) => comparar(l, eu) < 0).length + 1,
      nomeExibicao: eu.nomeExibicao ?? "Você",
      vendas: eu.vendas,
      ehVoce: true,
    };
  }

  return {
    top,
    voce,
    participantes: comVenda.length,
    anonimos: comVenda.length - publicos.length,
  };
}
