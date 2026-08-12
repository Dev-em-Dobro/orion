// F018 — contagem diária de uso (modo Orion).

import { prisma } from "@/lib/db";
import { obterModoChave } from "@/lib/chaves/modo";
import { dataHojeBr } from "./data";
import { QuotaExcedidaError } from "./erros";
import {
  LIMITES_DIARIOS,
  OPERACOES_COTA,
  toPrismaOperacao,
  type OperacaoCota,
  type VisaoUso,
} from "./tipos";

function visaoDe(operacao: OperacaoCota, usado: number): VisaoUso {
  const limite = LIMITES_DIARIOS[operacao];
  return {
    operacao,
    usado,
    limite,
    restante: Math.max(0, limite - usado),
  };
}

async function contadorAtual(
  userId: string,
  operacao: OperacaoCota,
): Promise<number> {
  const data = dataHojeBr();
  const row = await prisma.dailyUsage.findUnique({
    where: {
      user_id_data_operacao: {
        user_id: userId,
        data,
        operacao: toPrismaOperacao(operacao),
      },
    },
  });
  return row?.contador ?? 0;
}

/** Lista uso de todas as operações com cota (hoje, timezone BR). */
export async function listarUsoDiario(userId: string): Promise<VisaoUso[]> {
  const data = dataHojeBr();
  const rows = await prisma.dailyUsage.findMany({
    where: { user_id: userId, data },
  });
  const mapa = new Map(rows.map((r) => [r.operacao, r.contador]));
  return OPERACOES_COTA.map((op) =>
    visaoDe(op, mapa.get(toPrismaOperacao(op)) ?? 0),
  );
}

export async function obterUsoDiario(
  userId: string,
  operacao: OperacaoCota,
): Promise<VisaoUso> {
  const usado = await contadorAtual(userId, operacao);
  return visaoDe(operacao, usado);
}

/** Só aplica cotas no modo Orion. */
export async function verificarCota(
  userId: string,
  operacao: OperacaoCota,
): Promise<void> {
  const modo = await obterModoChave(userId);
  if (modo === "byok") return;

  const { usado, limite } = await obterUsoDiario(userId, operacao);
  if (usado >= limite) {
    throw new QuotaExcedidaError(operacao, usado, limite);
  }
}

/** Incrementa contador após sucesso (modo Orion). Idempotente sob limite. */
export async function consumirCota(
  userId: string,
  operacao: OperacaoCota,
): Promise<VisaoUso> {
  const modo = await obterModoChave(userId);
  if (modo === "byok") {
    return visaoDe(operacao, 0);
  }

  const data = dataHojeBr();
  const limite = LIMITES_DIARIOS[operacao];
  const prismaOp = toPrismaOperacao(operacao);

  const row = await prisma.$transaction(async (tx) => {
    const atual = await tx.dailyUsage.findUnique({
      where: {
        user_id_data_operacao: {
          user_id: userId,
          data,
          operacao: prismaOp,
        },
      },
    });

    if (!atual) {
      return tx.dailyUsage.create({
        data: {
          user_id: userId,
          data,
          operacao: prismaOp,
          contador: 1,
        },
      });
    }

    if (atual.contador >= limite) {
      throw new QuotaExcedidaError(operacao, atual.contador, limite);
    }

    return tx.dailyUsage.update({
      where: { id: atual.id },
      data: { contador: { increment: 1 } },
    });
  });

  return visaoDe(operacao, row.contador);
}
