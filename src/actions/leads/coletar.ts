"use server";

// F001 — coleta de Leads via Google Places.
// Spec: /specs/02-features/F001-coleta-de-leads.md

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { exigirChave, obterModoChave } from "@/lib/chaves";
import { reportarErro } from "@/lib/observabilidade";
import { estornarCota, reservarCota } from "@/lib/limites";
import {
  consumirMensal,
  LimiteDoPlanoError,
  restanteDaOperacao,
} from "@/lib/planos";
import { mensagemEscopo, requireTenant } from "@/lib/db/scoped";
import {
  PLACES_PAGE_SIZE,
  PlacesError,
  textSearch,
} from "@/lib/places/textSearch";
import { mensagemDeErroPlaces } from "@/lib/places/erros";
import { NICHOS_POR_SLUG } from "@/lib/nichos/catalogo";
import { municipioPertence, ufValida } from "@/lib/localidades";
import { lerBusca, primeiroErro } from "@/lib/leads/busca";
import { triagem } from "@/lib/score/triagem";
import { SCORE_QUALIFICADO } from "@/lib/score/score";

export type ColetarState =
  | { kind: "idle" }
  | {
      kind: "ok";
      criados: number;
      ignorados: number;
      /** F025 — quantos já saíram da Triagem com score de Lead qualificado. */
      comPotencial: number;
      /** F035 — resultados descartados por não caberem na cota do mês. */
      foraDaCota: number;
      /** F033 — a busca com tipo veio vazia e foi refeita sem o filtro. */
      ampliou: boolean;
    }
  | { kind: "erro"; mensagem: string };

export async function coletarLeads(
  _prev: ColetarState,
  formData: FormData,
): Promise<ColetarState> {
  // F033 — a leitura vive em `lib/leads/busca.ts` justamente pra ser testável:
  // aqui dentro nada garantia que os nomes lidos batessem com os do formulário.
  const parsed = lerBusca(formData);

  if (!parsed.success) {
    return { kind: "erro", mensagem: primeiroErro(parsed) ?? "Input inválido" };
  }

  const { nicho: slug, termoLivre, uf: ufBruta, municipio, bairro } = parsed.data;

  const uf = ufValida(ufBruta);
  if (!uf) return { kind: "erro", mensagem: "Estado inválido" };
  if (!municipioPertence(uf, municipio)) {
    return {
      kind: "erro",
      mensagem: `"${municipio}" não é um município de ${uf}.`,
    };
  }

  const nicho = NICHOS_POR_SLUG.get(slug);
  const termo = nicho ? nicho.termoBusca : (termoLivre ?? "").trim();
  if (!termo) {
    return { kind: "erro", mensagem: "Descreva o que buscar" };
  }

  // "dentista Batel Curitiba PR" — bairro antes do município, como no endereço.
  const query = [termo, bairro?.trim(), municipio, uf]
    .filter((p): p is string => Boolean(p && p.length > 0))
    .join(" ");
  const paginas = Math.ceil(parsed.data.quantidade / PLACES_PAGE_SIZE);

  // Estado da reserva de cota: o `catch` precisa saber se há o que estornar.
  let reservou = false;
  let userId: string | null = null;

  try {
    // `userId` (o `let` acima) existe só pro `catch` saber quem estornar; o
    // valor de verdade vem daqui, e é ele que entra nos closures abaixo.
    const tenant = await requireTenant();
    userId = tenant.userId;

    // F035 (2026-08-13) — o teto mensal é cobrado AQUI, na coleta, que é onde
    // está o custo (Places). Com a cota zerada nem chamamos o Google: buscar
    // sem poder salvar nada é gastar requisição por nada.
    const cota = await restanteDaOperacao(tenant.userId, "lead_novo");
    if (cota.restante <= 0) {
      return {
        kind: "erro",
        mensagem: new LimiteDoPlanoError(
          cota.plano,
          cota.limite,
          cota.limite,
          "lead_novo",
        ).message,
      };
    }

    await reservarCota(tenant.userId, "coleta");
    reservou = true;
    const googleKey = await exigirChave(tenant.userId, "google");
    const resultados = await textSearch(query, googleKey, {
      includedType: nicho?.includedType,
      paginas,
    });

    // F025 — Triagem: score na hora, sem rede. Aritmética sobre o que o Places
    // já devolveu, então não custa tempo nem dinheiro.
    const triados = resultados.map((p) => ({
      resultado: p,
      score: triagem({
        categoria: p.categoria,
        num_avaliacoes: p.num_avaliacoes,
        website: p.website,
      }).score,
    }));

    // F035 — grava só o que cabe na cota do mês. O corte é aqui, depois da
    // triagem, pra sobrar o de maior potencial: ordena por score e leva os
    // primeiros. O que ficou de fora é descartado e o retorno diz quantos.
    const ordenados = [...triados].sort((a, b) => b.score - a.score);
    const cabem = ordenados.slice(0, cota.restante);
    const forfaCota = ordenados.length - cabem.length;

    // skipDuplicates: conflito em (user_id, place_id) é ignorado (F015).
    const { count: criados } = await prisma.lead.createMany({
      data: cabem.map(({ resultado: p, score }) => ({
        user_id: tenant.userId,
        nome: p.nome,
        endereco: p.endereco,
        telefone: p.telefone,
        website: p.website,
        categoria: p.categoria,
        nota: p.nota,
        num_avaliacoes: p.num_avaliacoes,
        place_id: p.id,
        score,
        score_estimado: true,
      })),
      skipDuplicates: true,
    });

    // Consome só o que virou Lead de verdade: duplicata que o dedupe ignorou
    // não ganhou nada pro aluno, então não pode cobrar cota (F035 AC15).
    await consumirMensal(tenant.userId, "lead_novo", criados);

    revalidatePath("/leads");
    revalidatePath("/");
    return {
      kind: "ok",
      criados,
      ignorados: cabem.length - criados,
      foraDaCota: forfaCota,
      comPotencial: cabem.filter((t) => t.score >= SCORE_QUALIFICADO).length,
      ampliou: resultados.ampliou === true,
    };
  } catch (e) {
    if (reservou && userId) {
      await estornarCota(userId, "coleta").catch(() => undefined);
    }
    const escopo = mensagemEscopo(e);
    if (escopo) return { kind: "erro", mensagem: escopo };
    if (e instanceof PlacesError) {
      // A tradução depende de quem é a chave (F033, emenda de 2026-08-19): a
      // mesma 403 pede coisas opostas em BYOK e no modo Orion. A consulta do
      // modo só roda aqui, no caminho de erro — o caminho feliz não paga por ela.
      const modo = userId ? await obterModoChave(userId) : "orion";
      const { mensagem, reportar } = mensagemDeErroPlaces(e, modo);
      if (reportar) {
        // O corpo cru do Google vive aqui, não na tela do aluno.
        reportarErro(e, {
          origem: "coletarLeads",
          status: e.status,
          detalhe: e.message.slice(0, 300),
          includedType: nicho?.includedType ?? "(nenhum)",
          nicho: slug,
        });
      }
      return { kind: "erro", mensagem };
    }
    return {
      kind: "erro",
      mensagem: e instanceof Error ? e.message : "Erro desconhecido",
    };
  }
}
