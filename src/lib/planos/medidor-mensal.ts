// F035 (2026-08-13) — teto **mensal** por operação: o que define o plano.
// Spec: /specs/02-features/F035-planos-e-limites.md
//
// Convive com a cota diária da F018, que continua existindo com outro papel:
//
//   F018 (diária)  → freio anti-abuso/loop, some à meia-noite, igual em todo plano
//   F035 (mensal)  → o que o plano vende, reseta na competência, sobe com o plano
//
// Quem bater primeiro barra. No Free, com 5 perguntas de Agente por mês, a
// mensal sempre chega antes.

import type { OperacaoMensal as OperacaoPrisma, Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  limiteDaOperacao,
  type OperacaoMensal,
  type Plano,
} from "./catalogo";
import { competenciaDe } from "./competencia";
import { LimiteDoPlanoError } from "./erros";
import { planoDoUsuario } from "./resolver";

/** Cliente Prisma ou transação — o incremento roda dentro da transação. */
type Db = Prisma.TransactionClient | typeof prisma;

export type UsoMensalOperacao = {
  operacao: OperacaoMensal;
  usado: number;
  limite: number;
  restante: number;
  /** Fração 0–1, saturada em 1. É o que a barra desenha. */
  fracao: number;
};

function paraPrisma(op: OperacaoMensal): OperacaoPrisma {
  return op as OperacaoPrisma;
}

async function contador(
  userId: string,
  operacao: OperacaoMensal,
  competencia: string,
  db: Db = prisma,
): Promise<number> {
  const linha = await db.usoMensalOperacao.findUnique({
    where: {
      user_id_competencia_operacao: {
        user_id: userId,
        competencia,
        operacao: paraPrisma(operacao),
      },
    },
    select: { contador: true },
  });
  return linha?.contador ?? 0;
}

export async function usoDaOperacao(
  userId: string,
  operacao: OperacaoMensal,
  agora: Date = new Date(),
): Promise<UsoMensalOperacao> {
  const competencia = competenciaDe(agora);
  const [plano, usado] = await Promise.all([
    planoDoUsuario(userId),
    contador(userId, operacao, competencia),
  ]);
  const limite = limiteDaOperacao(plano, operacao);
  return {
    operacao,
    usado,
    limite,
    restante: Math.max(0, limite - usado),
    fracao: limite > 0 ? Math.min(1, usado / limite) : 1,
  };
}

/** Todas as operações de uma vez — uma consulta só, pro popover do medidor. */
export async function usoMensalCompleto(
  userId: string,
  operacoes: readonly OperacaoMensal[],
  agora: Date = new Date(),
): Promise<UsoMensalOperacao[]> {
  const competencia = competenciaDe(agora);
  const [plano, linhas] = await Promise.all([
    planoDoUsuario(userId),
    prisma.usoMensalOperacao.findMany({
      where: { user_id: userId, competencia },
      select: { operacao: true, contador: true },
    }),
  ]);
  const porOperacao = new Map(linhas.map((l) => [l.operacao, l.contador]));
  return operacoes.map((operacao) => {
    const usado = porOperacao.get(paraPrisma(operacao)) ?? 0;
    const limite = limiteDaOperacao(plano, operacao);
    return {
      operacao,
      usado,
      limite,
      restante: Math.max(0, limite - usado),
      fracao: limite > 0 ? Math.min(1, usado / limite) : 1,
    };
  });
}

/** Quanto ainda cabe nesta competência. Zero = estourado. */
export async function restanteDaOperacao(
  userId: string,
  operacao: OperacaoMensal,
  agora: Date = new Date(),
): Promise<{ restante: number; limite: number; plano: Plano }> {
  const competencia = competenciaDe(agora);
  const [plano, usado] = await Promise.all([
    planoDoUsuario(userId),
    contador(userId, operacao, competencia),
  ]);
  const limite = limiteDaOperacao(plano, operacao);
  return { restante: Math.max(0, limite - usado), limite, plano };
}

/** Barra antes de gastar API. Lança `LimiteDoPlanoError` no teto. */
export async function verificarLimiteMensal(
  userId: string,
  operacao: OperacaoMensal,
  agora: Date = new Date(),
): Promise<void> {
  const { restante, limite, plano } = await restanteDaOperacao(
    userId,
    operacao,
    agora,
  );
  if (restante <= 0) {
    throw new LimiteDoPlanoError(plano, limite, limite);
  }
}

/**
 * Incrementa o contador. `quantidade` existe por causa de `lead_novo`: uma
 * coleta cria N Leads de uma vez, e cobrar 1 por busca seria mentir sobre o
 * consumo.
 *
 * O `increment` do Prisma é atômico no banco, então duas chamadas simultâneas
 * somam certo — o teto ainda pode ser furado por pouco numa corrida, e isso é
 * deliberado (preferimos entregar a mais a travar com lock pessimista).
 */
export async function consumirMensal(
  userId: string,
  operacao: OperacaoMensal,
  quantidade = 1,
  db: Db = prisma,
  agora: Date = new Date(),
): Promise<void> {
  if (quantidade <= 0) return;
  const competencia = competenciaDe(agora);
  await db.usoMensalOperacao.upsert({
    where: {
      user_id_competencia_operacao: {
        user_id: userId,
        competencia,
        operacao: paraPrisma(operacao),
      },
    },
    create: {
      user_id: userId,
      competencia,
      operacao: paraPrisma(operacao),
      contador: quantidade,
    },
    update: { contador: { increment: quantidade } },
  });
}
