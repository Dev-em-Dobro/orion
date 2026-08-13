"use server";

// F037 — aceite (e revogação) de aparecer no Ranking de Builders.
// Spec: /specs/02-features/F037-ranking-de-builders.md

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import { nomeExibicaoPadrao } from "@/lib/ranking";

const schema = z.object({
  // Checkbox: ausente no FormData quando desmarcado.
  optin: z.coerce.boolean().default(false),
  nome: z
    .string()
    .trim()
    .min(2, "Escolha um nome com pelo menos 2 letras")
    .max(40, "Nome muito longo (máx. 40)")
    // Sem @ pra ninguém colar o próprio e-mail sem perceber que isso ficaria
    // visível pros outros alunos.
    .refine((n) => !n.includes("@"), "Não use e-mail como nome de exibição"),
});

export type PerfilPublicoState =
  | { kind: "idle" }
  | { kind: "ok"; mensagem: string }
  | { kind: "erro"; mensagem: string };

export async function salvarPerfilPublicoAction(
  _prev: PerfilPublicoState,
  formData: FormData,
): Promise<PerfilPublicoState> {
  const parsed = schema.safeParse({
    optin: formData.get("optin") ?? false,
    nome: formData.get("nome") ?? "",
  });
  if (!parsed.success) {
    return {
      kind: "erro",
      mensagem: parsed.error.issues[0]?.message ?? "Input inválido",
    };
  }

  try {
    const { userId } = await requireTenant();
    const { optin, nome } = parsed.data;

    await prisma.perfilPublico.upsert({
      where: { user_id: userId },
      create: {
        user_id: userId,
        ranking_optin: optin,
        nome_exibicao: nome || nomeExibicaoPadrao(null),
        optin_em: optin ? new Date() : null,
      },
      update: {
        ranking_optin: optin,
        nome_exibicao: nome,
        // Revogar limpa a data: o registro de quando ele aceitou não pode
        // sobreviver ao "não aceito mais".
        optin_em: optin ? new Date() : null,
      },
    });

    revalidatePath("/configuracao");
    revalidatePath("/ranking");

    return {
      kind: "ok",
      mensagem: optin
        ? `Você aparece como "${nome}" no ranking.`
        : "Você saiu do ranking — nenhum outro aluno vê seu nome, nem nos meses passados.",
    };
  } catch (e) {
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    throw e;
  }
}
