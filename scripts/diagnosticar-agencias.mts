/**
 * Roda o Diagnóstico **só nos Leads importados**, deixando os de seed em paz.
 *
 *   npx tsx scripts/diagnosticar-agencias.mts            # os 10 melhores
 *   npx tsx scripts/diagnosticar-agencias.mts --limite 44
 *
 * ## Por que não usar o botão "Aprofundar" da tela
 *
 * O botão pega os candidatos **por score da Triagem**, e a base tem 15 Leads de
 * demonstração (`seed-dev`, `place_id` começando com `demo-`) que a Triagem
 * pontuou em 92 e 71 — acima de qualquer agência. Clicar lá gastaria os
 * primeiros diagnósticos em dado falso. Este script filtra `demo-` fora.
 *
 * ## O que ele espelha da Server Action (F025)
 *
 * Mesma sequência de `aprofundarLote`: reserva cota → `executarDiagnostico` →
 * `persistirDiagnostico` → `recalcularScore`, com estorno em qualquer falha.
 * A cota é respeitada de propósito: furá-la deixaria o medidor da tela mentindo
 * sobre o uso do dia.
 *
 * A chave vem de `GOOGLE_API_KEY` ou `ORION_GOOGLE_API_KEY` — o app só aceita a
 * segunda, mas aqui não faz sentido travar por nome de variável.
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { executarDiagnostico } from "../src/lib/diagnostico/executar.ts";
import { persistirDiagnostico } from "../src/lib/diagnostico/persistir.ts";
import { recalcularScore } from "../src/lib/score/recalcular.ts";
import { estornarCota, reservarCota } from "../src/lib/limites/index.ts";

const prisma = new PrismaClient();

const EMAIL = process.env.PERF_EMAIL ?? "devemdobro@gmail.com";
/** Mesmo tamanho de lote da F025: paralelo dentro do lote, série entre eles. */
const LOTE = 3;

function argNumero(flag: string, padrao: number): number {
  const i = process.argv.indexOf(flag);
  if (i === -1) return padrao;
  const v = Number(process.argv[i + 1]);
  return Number.isFinite(v) && v > 0 ? Math.trunc(v) : padrao;
}

async function main() {
  const apiKey = (
    process.env.ORION_GOOGLE_API_KEY ?? process.env.GOOGLE_API_KEY
  )?.trim();
  if (!apiKey) {
    console.error("Chave Google ausente (GOOGLE_API_KEY no .env).");
    process.exit(1);
  }

  const limite = argNumero("--limite", 10);
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`usuário ${EMAIL} não existe`);

  const candidatos = await prisma.lead.findMany({
    where: {
      user_id: user.id,
      score_estimado: true,
      status: "novo",
      // Fora os Leads de demonstração.
      NOT: { place_id: { startsWith: "demo-" } },
    },
    orderBy: [{ score: "desc" }, { num_avaliacoes: "desc" }],
    take: limite,
  });

  console.log(
    `${candidatos.length} Leads (de ${limite} pedidos) · lotes de ${LOTE}\n`,
  );

  let ok = 0;
  let cotaEsgotada = false;
  const falhas: string[] = [];

  for (let i = 0; i < candidatos.length; i += LOTE) {
    const lote = candidatos.slice(i, i + LOTE);
    const resultados = await Promise.allSettled(
      lote.map(async (lead) => {
        await reservarCota(user.id, "diagnostico");
        try {
          const { dados, email } = await executarDiagnostico(
            lead.website,
            apiKey,
          );
          await persistirDiagnostico({ userId: user.id, lead, dados, email });
          const r = await recalcularScore(user.id, lead.id);
          return { lead, dados, score: r?.score ?? lead.score };
        } catch (e) {
          await estornarCota(user.id, "diagnostico").catch(() => undefined);
          throw e;
        }
      }),
    );

    for (const [j, r] of resultados.entries()) {
      const lead = lote[j]!;
      if (r.status === "fulfilled") {
        ok++;
        const d = r.value.dados;
        const sinais = [
          d.tem_site ? null : "SEM SITE",
          d.site_e_agregador ? "só agregador" : null,
          d.tem_site && d.tem_https === false ? "SEM HTTPS" : null,
          d.performance_mobile !== null && d.performance_mobile < 50
            ? `perf ${d.performance_mobile}`
            : null,
          d.atendimento_automatizado === "nao_detectado"
            ? "sem atendimento automatizado"
            : null,
        ].filter(Boolean);
        console.log(
          `  ${String(r.value.score).padStart(3)}  ${lead.nome.slice(0, 40).padEnd(42)}` +
            `${sinais.length ? sinais.join(" · ") : "nada gritante"}`,
        );
      } else {
        const msg = r.reason instanceof Error ? r.reason.message : String(r.reason);
        if (/cota|quota|limite/i.test(msg)) cotaEsgotada = true;
        falhas.push(`${lead.nome}: ${msg.slice(0, 70)}`);
      }
    }
  }

  console.log(`\n${ok} diagnosticados`);
  if (cotaEsgotada) console.log("cota diária de diagnósticos esgotada");
  if (falhas.length > 0) {
    console.log(`\nfalharam (${falhas.length}):`);
    for (const f of falhas) console.log(`  - ${f}`);
  }

  const restantes = await prisma.lead.count({
    where: {
      user_id: user.id,
      score_estimado: true,
      status: "novo",
      NOT: { place_id: { startsWith: "demo-" } },
    },
  });
  console.log(`\nainda sem Diagnóstico: ${restantes}`);
}

main()
  .catch((e) => {
    console.error("FALHOU:", e instanceof Error ? e.stack : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
