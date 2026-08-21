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

/**
 * Cidade acrescentada à busca. **Cidade, não segmento.**
 *
 * A primeira versão disto era `"agência de marketing"`, e o Ricardo achou na
 * mão o negócio que provou que estava errado: "Intensa" é a **Intensa
 * audiovisual**. Empurrar "agência de marketing" na consulta teria levado a
 * busca pra longe do negócio certo — o segmento é o que a gente está tentando
 * DESCOBRIR, então usá-lo como pista é circular. Cidade não tem esse problema:
 * ela restringe sem opinar sobre o que o negócio faz.
 *
 * Porto Alegre é o padrão porque os dois negócios confirmados na mão estão lá
 * (-30.03/-51.23 e -30.05/-51.22) e o repositório já tem esteira de POA
 * (`prospect-poa`, `outreach-poa`, `persistir-poa`). Se a lista for de outra
 * praça, passe `IMPORTAR_CIDADE`.
 */
const CIDADE = process.env.IMPORTAR_CIDADE ?? "Porto Alegre RS";

if (!ARQUIVO) {
  console.error(
    "uso: npx tsx scripts/importar-agencias.mts <arquivo.txt> [email]",
  );
  process.exit(1);
}

type Alvo = {
  /** O nome como está na lista — é ele que vai pro relatório de conferência. */
  nome: string;
  /** O que realmente vai pro Places. */
  consulta: string;
  /** `true` quando a linha traz uma consulta escrita à mão. */
  fixada: boolean;
};

/**
 * Uma linha vira um alvo. Aceita `Nome → consulta` (ou `|`) pra quando o nome
 * sozinho não acha o negócio certo e alguém já conferiu no mapa qual é.
 *
 * A consulta fixada NÃO recebe a cidade automática: quem escreveu a linha já
 * disse exatamente o que quer buscar, e concatenar cidade em cima disso pode
 * duplicar ("... Porto Alegre Porto Alegre RS") e piorar o resultado.
 */
function alvoDaLinha(linha: string): Alvo | null {
  const cru = linha.trim();
  if (cru.startsWith("#")) return null;

  const limpo = cru.replace(/^\d+\s*[.)-]\s*/, "").replace(/^[-•*]\s*/, "");
  if (limpo.length < 3) return null;

  const partes = limpo.split(/\s*(?:→|\|)\s*/);
  const nome = partes[0]?.trim() ?? "";
  const fixada = partes.length > 1 && Boolean(partes[1]?.trim());
  if (nome.length < 3) return null;

  return {
    nome,
    consulta: fixada ? partes[1]!.trim() : `${nome} ${CIDADE}`.trim(),
    fixada,
  };
}

/**
 * O Places devolve o candidato mais relevante primeiro. Aceitamos o primeiro,
 * mas registramos o nome que veio pra conferência: buscar "Intensa" sem cidade
 * cai em outro negócio, e um Lead errado na base é pior que um Lead faltando —
 * você liga, fala do site errado e queima o contato.
 */
function melhorCandidato(res: PlacesResult[]): PlacesResult | null {
  return res[0] ?? null;
}

/**
 * Comparação frouxa: o Places quase nunca devolve o nome exatamente como está
 * na lista ("Agência Cow" → "Cow"). Ignora acento, pontuação e as palavras
 * genéricas do ramo, e aceita se um contém o outro. Serve pra decidir se vale
 * pedir conferência humana, não pra decidir o que grava.
 */
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
  // `ORION_GOOGLE_API_KEY` é o nome que o app usa pra chave da plataforma
  // (F018); `GOOGLE_API_KEY` é o nome óbvio pra quem está só rodando o script.
  // Aceitar os dois evita um erro de "chave ausente" com a chave ali no .env.
  const apiKey = (
    process.env.ORION_GOOGLE_API_KEY ?? process.env.GOOGLE_API_KEY
  )?.trim();
  if (!apiKey) {
    console.error(
      "Chave Google ausente. Ponha GOOGLE_API_KEY (ou ORION_GOOGLE_API_KEY) no .env.",
    );
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.error(`usuário ${EMAIL} não existe no banco`);
    process.exit(1);
  }

  const alvos = readFileSync(ARQUIVO, "utf8")
    .split(/\r?\n/)
    .map(alvoDaLinha)
    .filter((a): a is Alvo => a !== null);

  const fixadas = alvos.filter((a) => a.fixada).length;
  console.log(
    `${alvos.length} negócios (${fixadas} com busca fixada à mão) · cidade "${CIDADE}" · usuário ${EMAIL}\n`,
  );

  const achados: { alvo: Alvo; place: PlacesResult; confere: boolean }[] = [];
  const semResultado: string[] = [];

  for (const [i, alvo] of alvos.entries()) {
    try {
      const res = await textSearch(alvo.consulta, apiKey, { paginas: 1 });
      const place = melhorCandidato(res);
      if (!place) {
        semResultado.push(alvo.nome);
        console.log(`  ${String(i + 1).padStart(2)}. ${alvo.nome.padEnd(34)} — nada`);
        continue;
      }
      // Busca fixada já foi conferida por gente no mapa: não faz sentido o
      // script "duvidar" dela por o nome não bater com o da lista, que é
      // justamente o nome ruim que motivou a correção.
      const confere = alvo.fixada || pareceOMesmo(alvo.nome, place.nome);
      achados.push({ alvo, place, confere });
      console.log(
        `  ${String(i + 1).padStart(2)}. ${alvo.nome.padEnd(34)} → ${place.nome}` +
          `${confere ? "" : "  ⚠ CONFIRA"}` +
          `${place.telefone ? "" : "  [sem telefone]"}` +
          `${place.website ? "" : "  [sem site]"}`,
      );
    } catch (e) {
      semResultado.push(alvo.nome);
      console.log(
        `  ${String(i + 1).padStart(2)}. ${alvo.nome.padEnd(34)} — erro: ${
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
  console.log(
    `${achados.length - semTelefone} com telefone · ${achados.length - semSite} com site`,
  );
  if (semTelefone > 0 || semSite > 0) {
    console.log(`  (${semTelefone} sem telefone, ${semSite} sem site)`);
  }
  if (semResultado.length > 0) {
    console.log(`\nnão achou no Places (${semResultado.length}):`);
    for (const n of semResultado) console.log(`  - ${n}`);
  }
  if (duvidosos.length > 0) {
    console.log(
      `\nCONFIRA — o Places devolveu nome diferente (${duvidosos.length}).`,
    );
    console.log(
      "Pra corrigir, ache no Google Maps e escreva a busca boa na lista:",
    );
    console.log('  <n>. Nome → Nome completo do negócio Cidade\n');
    for (const d of duvidosos) {
      console.log(`  - "${d.alvo.nome}" → "${d.place.nome}"  ${d.place.endereco}`);
    }
  }
}

main()
  .catch((e) => {
    console.error("FALHOU:", e instanceof Error ? e.stack : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
