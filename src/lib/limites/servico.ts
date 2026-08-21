// F018 — contagem diária de uso (modo Orion).
// Reserva atômica ANTES de APIs pagas (evita race TOCTOU).

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

/**
 * Prisma só expõe o código do erro; comparar a string evita arrastar o
 * namespace `Prisma` (e o runtime dele) pra dentro da camada de domínio.
 */
function ehConflitoDeUnique(e: unknown): boolean {
  return (
    typeof e === "object" &&
    e !== null &&
    "code" in e &&
    (e as { code?: unknown }).code === "P2002"
  );
}

/**
 * Reserva 1 unidade de cota de forma atômica (modo Orion).
 * Chamar ANTES de Places/LLM; em falha posterior use `estornarCota`.
 *
 * O teto vive no `WHERE`, não numa leitura anterior: o Postgres reavalia
 * `contador < limite` contra a versão já commitada da linha quando duas
 * requisições disputam o mesmo slot, então a segunda **não** atualiza. Ler o
 * contador antes e decidir no JS deixava as duas passarem — era o bug que
 * a [ADR-017] descreve.
 */
export async function reservarCota(
  userId: string,
  operacao: OperacaoCota,
): Promise<VisaoUso> {
  const modo = await obterModoChave(userId);
  if (modo === "byok") {
    return visaoDe(operacao, 0);
  }

  const data = dataHojeBr();
  const limite = LIMITES_DIARIOS[operacao];
  const chave = { user_id: userId, data, operacao: toPrismaOperacao(operacao) };

  /** `UPDATE … SET contador = contador + 1 WHERE … AND contador < limite`. */
  async function incrementar(): Promise<number | null> {
    const linhas = await prisma.dailyUsage.updateManyAndReturn({
      where: { ...chave, contador: { lt: limite } },
      data: { contador: { increment: 1 } },
      select: { contador: true },
    });
    return linhas[0]?.contador ?? null;
  }

  const contador = await incrementar();
  if (contador !== null) return visaoDe(operacao, contador);

  // Nada atualizado: ou a linha do dia ainda não existe, ou o teto chegou.
  // Distinguir antes de tentar criar mantém o `INSERT` que falha (e polui o
  // log do Postgres) restrito à corrida de verdade, não a toda tentativa
  // acima do teto.
  const atual = await prisma.dailyUsage.findUnique({
    where: { user_id_data_operacao: chave },
  });
  if (atual) {
    throw new QuotaExcedidaError(operacao, atual.contador, limite);
  }

  try {
    await prisma.dailyUsage.create({ data: { ...chave, contador: 1 } });
    return visaoDe(operacao, 1);
  } catch (e) {
    if (!ehConflitoDeUnique(e)) throw e;
  }

  // Corrida na primeira operação do dia — o lote paralelo da F025 cai aqui
  // toda manhã. Alguém criou a linha entre a leitura e o `INSERT`; agora que
  // ela existe, o mesmo incremento condicional resolve.
  const apos = await incrementar();
  if (apos !== null) return visaoDe(operacao, apos);

  throw new QuotaExcedidaError(
    operacao,
    await contadorAtual(userId, operacao),
    limite,
  );
}

/** @deprecated Use `reservarCota` (reserva atômica). Mantido como alias. */
export async function verificarCota(
  userId: string,
  operacao: OperacaoCota,
): Promise<void> {
  await reservarCota(userId, operacao);
}

/**
 * @deprecated A reserva já incrementa. No-op em sucesso (compat).
 * Preferir `reservarCota` + `estornarCota` no catch.
 */
export async function consumirCota(
  userId: string,
  operacao: OperacaoCota,
): Promise<VisaoUso> {
  return obterUsoDiario(userId, operacao);
}

/**
 * Desfaz uma reserva após falha da operação paga (modo Orion).
 *
 * O piso também mora no `WHERE`: sem linha ou com contador zerado, o UPDATE
 * não casa e nada acontece — não precisa de transação pra isso.
 */
export async function estornarCota(
  userId: string,
  operacao: OperacaoCota,
): Promise<void> {
  const modo = await obterModoChave(userId);
  if (modo === "byok") return;

  await prisma.dailyUsage.updateMany({
    where: {
      user_id: userId,
      data: dataHojeBr(),
      operacao: toPrismaOperacao(operacao),
      contador: { gt: 0 },
    },
    data: { contador: { decrement: 1 } },
  });
}
