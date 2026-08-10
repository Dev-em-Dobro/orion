// F002/F004 — persistência do Diagnóstico e das Dores dele.
// Extraído da action (F025) pra ser reusado pelo aprofundamento em lote.

import type { Lead } from "@prisma/client";
import { prisma } from "@/lib/db";
import { detectarDores, substituirDoresDoLead } from "@/lib/dores";
import { mudarStatus } from "@/lib/leads/status";
import type { DadosDiagnostico } from "./executar";

type Args = {
  userId: string;
  lead: Pick<Lead, "id" | "status" | "website" | "telefone">;
  dados: DadosDiagnostico;
};

/**
 * Grava o Diagnóstico e substitui as Dores do Lead. Promove `novo →
 * enriquecido`; a promoção a `priorizado` é do recálculo de score (F025), que
 * roda logo depois no fluxo automático.
 */
export async function persistirDiagnostico({ userId, lead, dados }: Args) {
  await prisma.$transaction([
    prisma.diagnostico.create({
      data: { user_id: userId, lead_id: lead.id, ...dados },
    }),
    ...(lead.status === "novo"
      ? [
          prisma.lead.update({
            where: { id: lead.id },
            data: mudarStatus("enriquecido"),
          }),
        ]
      : []),
  ]);

  // F004 — Dores do último Diagnóstico (substitui o conjunto anterior).
  await substituirDoresDoLead(
    userId,
    lead.id,
    detectarDores(dados, lead.website, lead.telefone),
  );
}
