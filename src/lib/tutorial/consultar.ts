// F039 — os números da base que decidem cada passo do tutorial.
// Spec: /specs/02-features/F039-primeiros-passos.md
//
// Só `count`: nenhuma linha de Lead sai do banco pra ser contada em memória.
// E só roda quando o painel abre — nenhuma rota ganha consulta nova (AC8).

import { prisma } from "@/lib/db";
import { chavesEssenciaisFaltando } from "@/lib/chaves";
import { obterModoChave } from "@/lib/chaves/modo";
import { FUNIL_VENDA, ONDE_NAO_DESCARTADO } from "@/lib/funil";
import type { FatosDoAluno } from "./passos";
import type { LeadStatus } from "@prisma/client";

/**
 * Estágios que provam que o aluno **mexeu no funil**.
 *
 * `contatado` fica de fora: ele sai de graça quando a Abordagem é marcada como
 * enviada (`marcarEnviado`), então incluí-lo daria o passo 5 por feito junto
 * com o 4. `perdido` entra — registrar que não deu certo também é registrar, e
 * é o desfecho mais comum das primeiras tentativas.
 *
 * Derivado de `FUNIL_VENDA` em vez de reescrito à mão: estágio novo na cadeia
 * de venda entra aqui sozinho.
 */
const ALEM_DE_CONTATADO: LeadStatus[] = [
  ...FUNIL_VENDA.filter((s) => s !== "contatado"),
  "perdido",
];

/**
 * Recebe o `userId` (padrão do `tarefasDoUsuario` na F031): quem chama já
 * resolveu a sessão. Todas as contagens são escopadas por `user_id` — o
 * tutorial é uma leitura do tenant como qualquer outra (F015, AC9).
 */
export async function fatosDoAluno(userId: string): Promise<FatosDoAluno> {
  const whereUser = { user_id: userId };

  const [
    faltando,
    modo,
    leads,
    leadsConfirmados,
    abordagensGeradas,
    abordagensEnviadas,
    leadsAlemDeContatado,
  ] = await Promise.all([
    chavesEssenciaisFaltando(userId),
    obterModoChave(userId),
    // Descartado (F024) fica fora das três contagens de Lead, como em toda
    // visão do app: quem descartou tudo tem a base vazia de novo, e o passo
    // volta a apontar pra busca — que é o conselho certo.
    prisma.lead.count({ where: { ...whereUser, ...ONDE_NAO_DESCARTADO } }),
    prisma.lead.count({
      where: { ...whereUser, ...ONDE_NAO_DESCARTADO, score_estimado: false },
    }),
    prisma.abordagem.count({ where: whereUser }),
    prisma.abordagem.count({ where: { ...whereUser, enviado: true } }),
    prisma.lead.count({
      where: { ...whereUser, status: { in: ALEM_DE_CONTATADO } },
    }),
  ]);

  return {
    chavesFaltando: faltando.length,
    modoOrion: modo === "orion",
    leads,
    leadsConfirmados,
    abordagensGeradas,
    abordagensEnviadas,
    leadsAlemDeContatado,
  };
}
