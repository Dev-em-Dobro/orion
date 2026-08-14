"use server";

// F034/F024 — manda Lead(s) da lista para o kanban e leva o aluno junto.
// Specs: /specs/02-features/F034-funil-kanban.md · F024-estado-do-lead-reversivel.md
//
// O botão do card era "Abordar no CRM" e abria o **detalhe do Lead** — nome e
// destino discordavam, e o funil (que é o CRM) ficava a dois cliques de
// distância. Agora ele faz o que diz.
//
// A promoção só acontece para quem está em `novo`: esse é o único status fora
// do board (`STATUS_DO_BOARD`), então mandar pro funil sem mexer nele mandaria
// o aluno para uma tela onde o Lead não aparece. Quem já está no board só é
// destacado — mexer no estágio de um Lead que já anda no funil apagaria
// trabalho.
//
// `enriquecido` e não `priorizado`: "Pronto pra abordar" é o que o
// aprofundamento concede depois de confirmar o score (F025). Dizer isso de um
// Lead que o aluno só empurrou para a fila seria promessa que o dado não
// sustenta.

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import { mudarStatus } from "@/lib/leads/status";

/** Teto por chamada — o mesmo do descarte em lote. */
const MAX_IDS = 200;

const schema = z.object({
  lead_ids: z
    .string()
    .transform((s) => s.split(",").map((x) => x.trim()).filter(Boolean))
    .pipe(z.array(z.string().cuid()).min(1).max(MAX_IDS)),
});

export type MandarProFunilState =
  | { kind: "idle" }
  | { kind: "erro"; mensagem: string };

export async function mandarProFunil(
  _prev: MandarProFunilState,
  formData: FormData,
): Promise<MandarProFunilState> {
  const parsed = schema.safeParse({ lead_ids: formData.get("lead_ids") });
  if (!parsed.success) {
    return { kind: "erro", mensagem: "Seleção inválida" };
  }
  const ids = parsed.data.lead_ids;

  let destino: string;
  try {
    const { userId } = await requireTenant();

    // `updateMany` com `user_id` no WHERE: o escopo do tenant vai na consulta,
    // não numa checagem antes dela (F015). Id de outro aluno simplesmente não
    // casa — não há o que vazar nem o que negar.
    await prisma.lead.updateMany({
      where: { id: { in: ids }, user_id: userId, status: "novo" },
      data: mudarStatus("enriquecido"),
    });

    // Só os que realmente estão no board entram no destaque. Pedir destaque de
    // um Lead descartado deixaria a tela procurando um card que não existe.
    const noBoard = await prisma.lead.findMany({
      where: {
        id: { in: ids },
        user_id: userId,
        status: { notIn: ["novo", "descartado"] },
      },
      select: { id: true },
    });

    revalidatePath("/leads");
    revalidatePath("/funil");
    revalidatePath("/");

    const destaque = noBoard.map((l) => l.id).join(",");
    destino = destaque ? `/funil?destaque=${destaque}` : "/funil";
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }

  // `redirect` fora do try: ele funciona lançando, e o catch acima engoliria.
  redirect(destino);
}
