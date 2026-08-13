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
import { estornarCota, reservarCota } from "@/lib/limites";
import { QuotaExcedidaError } from "@/lib/limites/erros";
import { LimiteDoPlanoError, usoDoPlano, verificarLimiteMensal } from "@/lib/planos";
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
      /** F035 — teto mensal do plano. Diferente da cota diária: não passa
       *  amanhã, passa mês que vem (ou trocando de plano). */
      limiteAtingido: boolean;
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
        limiteAtingido: false,
        mensagem: "Nada para aprofundar.",
      };
    }

    let processados = 0;
    let cotaEsgotada = false;
    let limiteAtingido = false;

    // Paralelo dentro do lote (o teto é o próprio tamanho do lote, então não
    // precisa de biblioteca de fila). `allSettled`: um site fora do ar não
    // pode derrubar os outros dois — site fora do ar É diagnóstico válido.
    const resultados = await Promise.allSettled(
      candidatos.map(async (lead) => {
        // F035 — teto do plano antes da cota diária e antes de qualquer
        // chamada externa: no limite, nada é gasto.
        await verificarLimiteMensal(userId);
        // A reserva já incrementa: o lote roda em paralelo e dois Leads não
        // podem ler o mesmo contador antes de qualquer um escrever.
        await reservarCota(userId, "diagnostico");
        try {
          const { dados, email } = await executarDiagnostico(
            lead.website,
            googleKey,
          );
          await persistirDiagnostico({ userId, lead, dados, email });
          await recalcularScore(userId, lead.id);
        } catch (e) {
          // Rejeita de volta: o `allSettled` abaixo classifica por `r.reason`.
          await estornarCota(userId, "diagnostico").catch(() => undefined);
          throw e;
        }
      }),
    );

    for (const r of resultados) {
      if (r.status === "fulfilled") processados += 1;
      else if (r.reason instanceof QuotaExcedidaError) cotaEsgotada = true;
      else if (r.reason instanceof LimiteDoPlanoError) limiteAtingido = true;
    }

    const restantes = await prisma.lead.count({ where });

    revalidatePath("/leads");
    revalidatePath("/");

    // O limite do plano é o aviso mais forte: ele não passa amanhã.
    const uso = limiteAtingido ? await usoDoPlano(userId) : null;
    const mensagem = uso
      ? new LimiteDoPlanoError(uso.plano, uso.usado, uso.limite).message
      : cotaEsgotada
        ? "Limite diário de diagnósticos atingido. O que já foi aprofundado está salvo."
        : `${processados} Lead(s) aprofundado(s).`;

    return {
      kind: "ok",
      processados,
      restantes,
      cotaEsgotada,
      limiteAtingido,
      mensagem,
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
