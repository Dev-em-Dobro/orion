// F002/F004 — persistência do Diagnóstico e das Dores dele.
// Extraído da action (F025) pra ser reusado pelo aprofundamento em lote.

import type { Lead } from "@prisma/client";
import { prisma } from "@/lib/db";
import { detectarDores, substituirDoresDoLead } from "@/lib/dores";
import { mudarStatus } from "@/lib/leads/status";
import { contarLeadDiagnosticado } from "@/lib/planos/medidor";
import type { DadosDiagnostico } from "./executar";

type Args = {
  userId: string;
  lead: Pick<
    Lead,
    "id" | "status" | "website" | "telefone" | "email" | "email_origem"
  >;
  dados: DadosDiagnostico;
  /** F027 — e-mail achado no site nesta execução. */
  email?: string | null;
};

/**
 * Grava o Diagnóstico e substitui as Dores do Lead. Promove `novo →
 * enriquecido`; a promoção a `priorizado` é do recálculo de score (F025), que
 * roda logo depois no fluxo automático.
 */
export async function persistirDiagnostico({
  userId,
  lead,
  dados,
  email,
}: Args) {
  // F027 — e-mail digitado pelo aluno (`manual`) nunca é sobrescrito por um
  // re-diagnóstico: ele sabe mais que o parser.
  const gravarEmail =
    email && email !== lead.email && lead.email_origem !== "manual";

  const dadosLead = {
    ...(lead.status === "novo" ? mudarStatus("enriquecido") : {}),
    ...(gravarEmail ? { email, email_origem: "site" as const } : {}),
  };

  // Transação interativa (não a de array) porque o medidor da F035 precisa
  // saber, **dentro** dela, se este é o primeiro Diagnóstico do Lead.
  await prisma.$transaction(async (tx) => {
    // F035 — conta antes de criar: depois do create, todo Lead teria "um
    // Diagnóstico anterior" e o medidor nunca incrementaria.
    await contarLeadDiagnosticado(tx, userId, lead.id);

    await tx.diagnostico.create({
      data: { user_id: userId, lead_id: lead.id, ...dados },
    });
    if (Object.keys(dadosLead).length > 0) {
      await tx.lead.update({ where: { id: lead.id }, data: dadosLead });
    }
  });

  // F004 — Dores do último Diagnóstico (substitui o conjunto anterior).
  await substituirDoresDoLead(
    userId,
    lead.id,
    detectarDores(dados, lead.website, lead.telefone),
  );
}
