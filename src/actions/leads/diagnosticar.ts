"use server";

// F002 — Diagnóstico de presença digital.
// Spec: /specs/02-features/F002-diagnostico-de-presenca-digital.md

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigirChave } from "@/lib/chaves";
import { mensagemEscopo, requireLeadOwned } from "@/lib/db/scoped";
import { classificarWebsite } from "@/lib/diagnostico/agregador";
import { verificarSite } from "@/lib/diagnostico/verificarSite";
import { performanceMobile } from "@/lib/pagespeed/performanceMobile";
import { detectarDores, substituirDoresDoLead } from "@/lib/dores";

const schema = z.object({
  lead_id: z.string().cuid("lead_id inválido"),
});

export type DiagnosticarState =
  | { kind: "idle" }
  | { kind: "ok"; resumo: string }
  | { kind: "erro"; mensagem: string };

export async function diagnosticarLead(
  _prev: DiagnosticarState,
  formData: FormData,
): Promise<DiagnosticarState> {
  const parsed = schema.safeParse({ lead_id: formData.get("lead_id") });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "lead_id inválido" };
  }

  try {
    const { lead, userId } = await requireLeadOwned(parsed.data.lead_id);
    const googleKey = await exigirChave(userId, "google");

    let tem_site = false;
    let site_e_agregador = false;
    let tem_https: boolean | null = null;
    let tempo_carregamento_ms: number | null = null;
    let performance_mobile: number | null = null;

    if (lead.website) {
      const classif = classificarWebsite(lead.website);
      if (classif.ehAgregador) {
        tem_site = true;
        site_e_agregador = true;
        tem_https = classif.temHttps;
      } else {
        const site = await verificarSite(lead.website);
        if (site.temSite) {
          tem_site = true;
          tem_https = site.temHttps;
          tempo_carregamento_ms = site.tempoMs;
          try {
            performance_mobile = await performanceMobile(
              site.urlFinal,
              googleKey,
            );
          } catch {
            performance_mobile = null;
          }
        }
      }
    }

    await prisma.$transaction([
      prisma.diagnostico.create({
        data: {
          user_id: userId,
          lead_id: lead.id,
          tem_site,
          site_e_agregador,
          tem_https,
          tempo_carregamento_ms,
          performance_mobile,
        },
      }),
      ...(lead.status === "novo"
        ? [
            prisma.lead.update({
              where: { id: lead.id },
              data: { status: "enriquecido" },
            }),
          ]
        : []),
    ]);

    // F004 — Dores do último Diagnóstico (substitui conjunto anterior).
    await substituirDoresDoLead(
      userId,
      lead.id,
      detectarDores(
        {
          tem_site,
          site_e_agregador,
          tem_https,
          performance_mobile,
        },
        lead.website,
      ),
    );

    revalidatePath("/leads");

    const resumo = !lead.website
      ? "sem site"
      : site_e_agregador
        ? "presença só em agregador/rede social — sem site próprio"
        : !tem_site
          ? "site fora do ar"
          : [
              "site ok",
              tem_https ? "HTTPS ok" : "sem HTTPS",
              performance_mobile === null
                ? "performance indisponível"
                : `performance mobile ${performance_mobile}`,
            ].join(" · ");

    return { kind: "ok", resumo: `Diagnóstico concluído: ${resumo}.` };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
