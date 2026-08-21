"use server";

// F035 — exportar CSV é recurso de plano pago, então o CSV é montado **no
// servidor**. Fazer isso no navegador (como era antes) deixaria o gate valendo
// só enquanto o botão estivesse escondido.
// Spec: /specs/02-features/F035-planos-e-limites.md (AC9)

import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import { dorPrincipal } from "@/lib/dores/principal";
import { montarCsv } from "@/lib/leads/csv";
import { exigirRecurso } from "@/lib/planos";

const schema = z.object({
  ids: z.array(z.string().cuid()).min(1).max(500),
});

export type ExportarCsvState =
  | { kind: "idle" }
  | { kind: "ok"; csv: string; total: number }
  | { kind: "erro"; mensagem: string };

export async function exportarLeadsCsv(
  ids: string[],
): Promise<ExportarCsvState> {
  const parsed = schema.safeParse({ ids });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "Seleção inválida" };
  }

  try {
    const { userId, whereUser } = await requireTenant();
    await exigirRecurso(userId, "exportar_csv");

    // `whereUser` no where: id vindo do cliente nunca é suficiente (F015).
    const leads = await prisma.lead.findMany({
      where: { ...whereUser, id: { in: parsed.data.ids } },
      orderBy: [{ score: "desc" }, { created_at: "desc" }],
      include: {
        dores: { select: { tipo: true, severidade: true, detalhes: true } },
      },
    });

    const csv = montarCsv(
      leads.map((l) => ({
        nome: l.nome,
        categoria: l.categoria,
        status: l.status,
        score: l.score,
        telefone: l.telefone,
        website: l.website,
        endereco: l.endereco,
        dor_principal: dorPrincipal(l.dores)?.detalhes ?? null,
      })),
    );

    return { kind: "ok", csv, total: leads.length };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
