import { PrismaClient } from "@prisma/client";
import {
  CONTAGEM_ATIVA,
  registrarQuery,
} from "@/lib/observabilidade/contador-queries";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// F028 — em dev com ORION_LOG_QUERIES=1, cada query alimenta o contador por
// request (src/lib/observabilidade/contador-queries.ts). Em produção o client
// é o de sempre, sem listener e sem custo.
function criarPrisma(): PrismaClient {
  if (!CONTAGEM_ATIVA) return new PrismaClient();

  const client = new PrismaClient({
    log: [{ emit: "event", level: "query" }],
  });
  client.$on("query", registrarQuery);
  return client;
}

export const prisma = globalForPrisma.prisma ?? criarPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
