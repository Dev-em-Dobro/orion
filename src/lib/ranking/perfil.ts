// F037 — o consentimento do Builder. Sem linha = fora do ranking.
// Spec: /specs/02-features/F037-ranking-de-builders.md

import { prisma } from "@/lib/db";

export type PerfilPublico = {
  optin: boolean;
  nomeExibicao: string;
};

/**
 * Sugestão de nome público: primeiro nome + inicial do sobrenome. Nunca o
 * e-mail e nunca o nome completo por acidente — o aluno pode trocar por
 * qualquer coisa antes de aceitar.
 */
export function nomeExibicaoPadrao(nome: string | null | undefined): string {
  const partes = (nome ?? "").trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "Builder";
  if (partes.length === 1) return partes[0]!;
  return `${partes[0]} ${partes[partes.length - 1]![0]!.toUpperCase()}.`;
}

export async function obterPerfilPublico(
  userId: string,
  nomeDaConta: string | null,
): Promise<PerfilPublico> {
  const linha = await prisma.perfilPublico.findUnique({
    where: { user_id: userId },
    select: { ranking_optin: true, nome_exibicao: true },
  });
  return {
    optin: linha?.ranking_optin ?? false,
    nomeExibicao: linha?.nome_exibicao ?? nomeExibicaoPadrao(nomeDaConta),
  };
}
