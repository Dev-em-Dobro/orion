// F004 — substitui o conjunto de Dores do Lead no tenant (re-diagnóstico).

import { prisma } from "@/lib/db";
import type { DorDetectada } from "./detectar";

/**
 * Apaga Dores do Lead neste tenant e grava as novas.
 * Sempre escopado por `user_id` (F015).
 */
export async function substituirDoresDoLead(
  userId: string,
  leadId: string,
  dores: DorDetectada[],
): Promise<void> {
  await prisma.$transaction([
    prisma.dor.deleteMany({
      where: { user_id: userId, lead_id: leadId },
    }),
    ...(dores.length > 0
      ? [
          prisma.dor.createMany({
            data: dores.map((d) => ({
              user_id: userId,
              lead_id: leadId,
              tipo: d.tipo,
              severidade: d.severidade,
              detalhes: d.detalhes,
            })),
          }),
        ]
      : []),
  ]);
}
