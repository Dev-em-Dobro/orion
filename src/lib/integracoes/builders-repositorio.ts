// F044 — consultas agregadas (somente leitura) para o Builders Club.
// Spec: /specs/02-features/F044-estatisticas-builders.md

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { montarResultados, type Corpo, type Resultado } from "./builders-estatisticas";

/** Cliente só com leitura crua (o global ou o de uma transação nos testes). */
type Leitor = Pick<Prisma.TransactionClient, "$queryRaw">;

/**
 * Datas do Prisma ficam em `timestamp` (UTC, sem fuso). O dia de cada envio é
 * `enviado_em` UTC → America/Sao_Paulo. A ordem dos envios de cada Lead usa a
 * história inteira da conta, então um Lead abordado antes de `desde` só gera
 * retornos dentro da janela.
 */
export async function buscarEstatisticas({ emails, desde, ate }: Corpo, db: Leitor = prisma): Promise<Resultado[]> {
  const contas = await db.$queryRaw<{ id: string; email: string }[]>`
    SELECT DISTINCT ON (lower(email)) id, lower(email) AS email
    FROM "user"
    WHERE lower(email) = ANY(${emails}::text[])
    ORDER BY lower(email), "createdAt" ASC
  `;
  const usuarios = new Map(contas.map((conta) => [conta.email, conta.id]));
  const ids = contas.map((conta) => conta.id);
  if (!ids.length) return montarResultados(emails, usuarios, [], []);

  const [dias, funil] = await Promise.all([
    db.$queryRaw<{ userId: string; data: string; abordagens: number; retornos: number }[]>`
      WITH envios AS (
        SELECT user_id,
               ((enviado_em AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date AS dia,
               ROW_NUMBER() OVER (PARTITION BY user_id, lead_id ORDER BY enviado_em, id) AS ordem
        FROM "Outreach"
        WHERE enviado = true AND enviado_em IS NOT NULL AND user_id = ANY(${ids}::text[])
      )
      SELECT user_id AS "userId", to_char(dia, 'YYYY-MM-DD') AS data,
             COUNT(*) FILTER (WHERE ordem = 1)::int AS abordagens,
             COUNT(*) FILTER (WHERE ordem > 1)::int AS retornos
      FROM envios
      WHERE dia BETWEEN ${desde}::date AND ${ate}::date
      GROUP BY user_id, dia
      ORDER BY user_id, dia
    `,
    db.$queryRaw<{ userId: string; status: string; total: number }[]>`
      SELECT l.user_id AS "userId", l.status::text AS status, COUNT(*)::int AS total
      FROM "Lead" l
      WHERE l.user_id = ANY(${ids}::text[])
        AND l.status IN ('respondeu', 'qualificado', 'proposta', 'ganho')
        AND EXISTS (
          SELECT 1 FROM "Outreach" o
          WHERE o.lead_id = l.id AND o.user_id = l.user_id
            AND o.enviado = true AND o.enviado_em IS NOT NULL
            AND ((o.enviado_em AT TIME ZONE 'UTC') AT TIME ZONE 'America/Sao_Paulo')::date
                BETWEEN ${desde}::date AND ${ate}::date
        )
      GROUP BY l.user_id, l.status
    `,
  ]);
  return montarResultados(emails, usuarios, dias, funil);
}
