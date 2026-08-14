/**
 * Importa uma lista de nomes de negócio como Leads, resolvendo cada um no
 * Google Places pra pegar telefone, site e endereço.
 *
 *   ORION_GOOGLE_API_KEY=... npx tsx scripts/importar-agencias.mts lista.txt seu@email.com
 *
 * O arquivo é texto puro, um negócio por linha. Numeração ("12. Agência Noz") e
 * linhas de título são descartadas.
 *
 * Idempotente: `place_id` é único por usuário, então re-rodar atualiza o
 * contato em vez de duplicar o Lead.
 *
 * ## Por que este script existe em vez da coleta da UI
 *
 * A `/leads` coleta por **categoria + localidade** ("dentista em Porto Alegre"),
 * que é o fluxo do produto: você não sabe quem são, o Orion acha. Aqui a
 * situação é inversa — a lista de nomes já existe e o que falta é o contato de
 * cada um. São 50 buscas por nome, uma por Lead, e isso não é um caminho que a
 * UI oferece.
 *
 * ## O que ele NÃO faz
 *
 * Não roda Diagnóstico (isso consome PageSpeed e é o passo seguinte, pela UI ou
 * pelo botão "Aprofundar"). Os Leads entram como `novo` com score estimado pela
 * Triagem, exatamente como a coleta normal deixa.
 */

import "dotenv/config";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { textSearch, type PlacesResult } from "../src/lib/places/textSearch.ts";
import { triagem } from "../src/lib/score/triagem.ts";

const prisma = new PrismaClient();

const ARQUIVO = process.argv[2];
const EMAIL = process.argv[3] ?? "devemdobro@gmail.com";
/** Contexto acrescentado à busca — sem isso "Kombi" acha uma van. */
const CONTEXTO = process.env.IMPORTAR_CONTEXTO ?? "agência de marketing";

if (!ARQUIVO) {
  console.error(
    "uso: npx tsx scripts/importar-agencias.mts <arquivo.txt> [email]",
  );
  process.exit(1);
}

/** Tira numeração de lista, marcador e espaço. Linha vazia ou título → null. */
function nomeDaLinha(linha: string): string | null {
  const limpo = linha.trim().replace(/^\d+\s*[.)-]\s*/, "").replace(/^[-•*]\s*/, "");
  if (limpo.length < 3) return null;
  // Linha de título não tem numeração e costuma começar com um número solto
  // ("50 Agências para Prospecção") — o `replace` acima não a toca.
  if (/^\d+\s+\w+.*prospec/i.test(limpo)) return null;
  return limpo;
}

/**
 * O Places devolve o candidato mais relevante primeiro. Aceitamos o primeiro,
 * mas registramos o nome que veio pra você conferir: buscar "Intensa" ou
 * "Lumina" sem cidade pode cair em outro negócio, e um Lead errado na base é
 * pior que um Lead faltando.
 */
function melhorCandidato(res: PlacesResult[]): PlacesResult | null {
  return res[0] ?? null;
}

/** Igual ao `mesmoNome` que a triagem usaria: comparação frouxa pra conferir. */
function pareceOMesmo(procurado: string, achado: string): boolean {
  const norm = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/ag[eê]ncia|comunica[cç][aã]o|marketing|digital|propaganda/g, "")
      .replace(/[^a-z0-9]/g, "");
  const a = norm(procurado);
  const b = norm(achado);
  if (!a || !b) return false;
  return a.includes(b) || b.includes(a);
}

async function main() {
  const apiKey = process.env.ORION_GOOGLE_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "ORION_GOOGLE_API_KEY ausente. Ponha no .env ou passe na linha de comando.",
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.error(`usuário ${EMAIL} não existe no banco`);
    process.exit(1);
  }

  const nomes = readFileSync(ARQUIVO, "utf8")
    .split(/\r?\n/)
    .map(nomeDaLinha)
    .filter((n): n is string => n !== null);

  console.log(`${nomes.length} nomes · usuário ${EMAIL}\n`);

  const achados: { nome: string; place: PlacesResult; confere: boolean }[] = [];
  const semResultado: string[] = [];

  for (const [i, nome] of nomes.entries()) {
    const query = `${nome} ${CONTEXTO}`;
    try {
      const res = await textSearch(query, apiKey, { paginas: 1 });
      const place = melhorCandidato(res);
      if (!place) {
        semResultado.push(nome);
        console.log(`  ${String(i + 1).padStart(2)}. ${nome.padEnd(38)} — nada`);
        continue;
      }
      const confere = pareceOMesmo(nome, place.nome);
      achados.push({ nome, place, confere });
      console.log(
        `  ${String(i + 1).padStart(2)}. ${nome.padEnd(38)} → ${place.nome}` +
          `${confere ? "" : "  ⚠ nome diferente"}` +
          `${place.telefone ? "" : "  [sem telefone]"}` +
          `${place.website ? "" : "  [sem site]"}`,
      );
    } catch (e) {
      semResultado.push(nome);
      console.log(
        `  ${String(i + 1).padStart(2)}. ${nome.padEnd(38)} — erro: ${
          e instanceof Error ? e.message.slice(0, 60) : e
        }`,
      );
    }
  }

  console.log(`\ngravando ${achados.length} Leads…`);
  let criados = 0;
  let atualizados = 0;

  for (const { place } of achados) {
    // Mesma Triagem da coleta da UI (F025): aritmética sobre o que o Places já
    // devolveu, sem rede. Sem isto o Lead entraria com score 0 e afundaria no
    // fim da lista — o import ficaria inconsistente com a coleta normal.
    const { score } = triagem({
      categoria: place.categoria,
      num_avaliacoes: place.num_avaliacoes,
      website: place.website,
    });

    const dadosDoPlaces = {
      nome: place.nome,
      categoria: place.categoria,
      endereco: place.endereco,
      telefone: place.telefone,
      website: place.website,
      nota: place.nota,
      num_avaliacoes: place.num_avaliacoes,
    };

    // `upsert` na chave composta `[user_id, place_id]`, que já é única no
    // schema. Re-rodar atualiza o contato e o score da Triagem sem mexer no
    // `status`: se você já moveu o Lead no funil, o import não o puxa de volta
    // pra `novo`.
    const existente = await prisma.lead.findUnique({
      where: { user_id_place_id: { user_id: user.id, place_id: place.id } },
      select: { id: true },
    });

    if (existente) {
      await prisma.lead.update({
        where: { id: existente.id },
        data: dadosDoPlaces,
      });
      atualizados++;
    } else {
      await prisma.lead.create({
        data: {
          ...dadosDoPlaces,
          user_id: user.id,
          place_id: place.id,
          status: "novo",
          score,
          score_estimado: true,
        },
      });
      criados++;
    }
  }

  const semTelefone = achados.filter((a) => !a.place.telefone).length;
  const semSite = achados.filter((a) => !a.place.website).length;
  const duvidosos = achados.filter((a) => !a.confere);

  console.log(`\n${criados} criados · ${atualizados} atualizados`);
  console.log(`${semTelefone} sem telefone · ${semSite} sem site`);
  if (semResultado.length > 0) {
    console.log(`\nnão achou no Places (${semResultado.length}):`);
    for (const n of semResultado) console.log(`  - ${n}`);
  }
  if (duvidosos.length > 0) {
    console.log(`\nCONFIRA — o Places devolveu nome diferente (${duvidosos.length}):`);
    for (const d of duvidosos) console.log(`  - "${d.nome}" → "${d.place.nome}"`);
  }
}

main()
  .catch((e) => {
    console.error("FALHOU:", e instanceof Error ? e.stack : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
