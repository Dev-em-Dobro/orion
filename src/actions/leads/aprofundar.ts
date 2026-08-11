"use server";

// F025 — aprofundamento automático dos melhores da Triagem.
// Spec: /specs/02-features/F025-fila-do-dia.md
//
// Em lotes curtos, não numa varredura só: o ADR-002 proíbe worker, e uma
// Server Action não pode ficar minutos aberta. Quem repete a chamada é o
// navegador do aluno, com barra de progresso e botão Parar — sem cron, sem
// fila, e o aluno vendo o que está acontecendo.

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigirChave } from "@/lib/chaves";
import { consumirCota, verificarCota } from "@/lib/limites";
import { QuotaExcedidaError } from "@/lib/limites/erros";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import { executarDiagnostico } from "@/lib/diagnostico/executar";
import { persistirDiagnostico } from "@/lib/diagnostico/persistir";
import { recalcularScore } from "@/lib/score/recalcular";
import { LOTE_APROFUNDAMENTO } from "@/lib/leads/aprofundamento";

const schema = z.object({
  limite: z.coerce.number().int().min(1).max(5).default(LOTE_APROFUNDAMENTO),
});

export type AprofundarState =
  | { kind: "idle" }
  | {
      kind: "ok";
      processados: number;
      restantes: number;
      cotaEsgotada: boolean;
      mensagem: string;
    }
  | { kind: "erro"; mensagem: string };

export async function aprofundarLote(
  _prev: AprofundarState,
  formData: FormData,
): Promise<AprofundarState> {
  const parsed = schema.safeParse({ limite: formData.get("limite") });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "limite inválido" };
  }

  try {
    const { userId, whereUser } = await requireTenant();
    const googleKey = await exigirChave(userId, "google");

    // Candidatos: score ainda estimado, sem Diagnóstico, não descartados.
    // Ordem por score desc — aprofunda quem a Triagem apontou como melhor.
    const where = {
      ...whereUser,
      score_estimado: true,
      status: "novo" as const,
    };

    const candidatos = await prisma.lead.findMany({
      where,
      orderBy: [{ score: "desc" }, { created_at: "desc" }],
      take: parsed.data.limite,
    });

    if (candidatos.length === 0) {
      return {
        kind: "ok",
        processados: 0,
        restantes: 0,
        cotaEsgotada: false,
        mensagem: "Nada para aprofundar.",
      };
    }

    let processados = 0;
    let cotaEsgotada = false;

    // Paralelo dentro do lote (o teto é o próprio tamanho do lote, então não
    // precisa de biblioteca de fila). `allSettled`: um site fora do ar não
    // pode derrubar os outros dois — site fora do ar É diagnóstico válido.
    const resultados = await Promise.allSettled(
      candidatos.map(async (lead) => {
        await verificarCota(userId, "diagnostico");
        const { dados, email } = await executarDiagnostico(
          lead.website,
          googleKey,
        );
        await persistirDiagnostico({ userId, lead, dados, email });
        await recalcularScore(userId, lead.id);
        await consumirCota(userId, "diagnostico");
      }),
    );

    for (const r of resultados) {
      if (r.status === "fulfilled") processados += 1;
      else if (r.reason instanceof QuotaExcedidaError) cotaEsgotada = true;
    }

    const restantes = await prisma.lead.count({ where });

    revalidatePath("/leads");
    revalidatePath("/");

    return {
      kind: "ok",
      processados,
      restantes,
      cotaEsgotada,
      mensagem: cotaEsgotada
        ? "Limite diário de diagnósticos atingido. O que já foi aprofundado está salvo."
        : `${processados} Lead(s) aprofundado(s).`,
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
