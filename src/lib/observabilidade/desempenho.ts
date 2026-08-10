// F028 — instrumentação de desempenho (etapa 1: medir antes de otimizar).
// Spec: /specs/02-features/F028-desempenho.md · ADR-015 §4
//
// Sem dependência de Next nem de Prisma: só relógio e env.

/** Região onde a função está rodando (Vercel) — "local" fora da Vercel. */
export function regiaoDaFuncao(): string {
  return process.env.VERCEL_REGION?.trim() || "local";
}

/** Executa `fn` cronometrando. Devolve o valor e o tempo em ms (1 casa). */
export async function medirMs<T>(
  fn: () => Promise<T>,
): Promise<{ valor: T; ms: number }> {
  const inicio = performance.now();
  const valor = await fn();
  return { valor, ms: Math.round((performance.now() - inicio) * 10) / 10 };
}

/**
 * Alvo do AC1 da F028: RTT função ↔ banco. Acima disso, função e banco
 * provavelmente não estão co-localizados (ADR-015).
 */
export const DB_RTT_ALVO_MS = 15;
