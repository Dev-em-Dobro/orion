// F028 — contagem de queries por request (etapa 1 da spec).
// Spec: /specs/02-features/F028-desempenho.md (AC5: ≤ 4 queries por página)
//
// Só liga em desenvolvimento e com ORION_LOG_QUERIES=1 — em produção o custo
// (um AsyncLocalStorage por request + log por query) não se paga.
//
// AsyncLocalStorage é do Node (node:async_hooks), não é dependência nova.

import { AsyncLocalStorage } from "node:async_hooks";

export const CONTAGEM_ATIVA =
  process.env.NODE_ENV !== "production" &&
  process.env.ORION_LOG_QUERIES === "1";

type Janela = { nome: string; queries: number; inicio: number };

const armazenamento = new AsyncLocalStorage<Janela>();

/** Chamado pelo listener de query do Prisma (src/lib/db.ts). */
export function registrarQuery(): void {
  const janela = armazenamento.getStore();
  if (janela) janela.queries += 1;
}

/**
 * Envolve o carregamento de dados de uma página e loga quantas queries ela
 * fez. Use no topo do server component:
 *
 *   return medirRequest("/leads", async () => { ...corpo da página... });
 *
 * Fora de dev (ou sem ORION_LOG_QUERIES=1) é passagem direta, sem custo.
 */
export async function medirRequest<T>(
  nome: string,
  fn: () => Promise<T>,
): Promise<T> {
  if (!CONTAGEM_ATIVA) return fn();

  const janela: Janela = { nome, queries: 0, inicio: performance.now() };
  return armazenamento.run(janela, async () => {
    try {
      return await fn();
    } finally {
      const ms = Math.round(performance.now() - janela.inicio);
      const alerta = janela.queries > 4 ? "  ← acima do teto da F028 (4)" : "";
      console.log(
        `[queries] ${janela.nome} → ${janela.queries} queries em ${ms}ms${alerta}`,
      );
    }
  });
}
