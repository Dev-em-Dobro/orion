/**
 * Backfill: reaplica as regras de Dor e de score sobre os Diagnósticos que já
 * estão no banco.
 *
 *   npx tsx scripts/rederivar-dores.mts            # mostra o que mudaria
 *   npx tsx scripts/rederivar-dores.mts --aplicar  # grava
 *
 * **Não faz requisição nenhuma.** A emenda de 2026-08-14 da F004/F003 usa o
 * `tempo_carregamento_ms`, que a F002 já gravava desde sempre — o dado para
 * gerar a Dor nova está no banco, só nunca tinha sido lido. Rediagnosticar
 * gastaria cota e rede para redescobrir o que já se sabe.
 *
 * Idempotente: `substituirDoresDoLead` apaga e regrava o conjunto (F004 AC2).
 */

import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { detectarDores } from "../src/lib/dores/detectar.ts";
import { substituirDoresDoLead } from "../src/lib/dores/persistir.ts";
import { recalcularScore } from "../src/lib/score/recalcular.ts";

const prisma = new PrismaClient();
const EMAIL = process.env.PERF_EMAIL ?? "devemdobro@gmail.com";
const APLICAR = process.argv.includes("--aplicar");

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`usuário ${EMAIL} não existe`);

  const leads = await prisma.lead.findMany({
    where: { user_id: user.id, diagnosticos: { some: {} } },
    include: {
      diagnosticos: { orderBy: { executado_em: "desc" }, take: 1 },
      dores: true,
    },
  });

  console.log(
    `${leads.length} Leads com Diagnóstico · modo ${APLICAR ? "APLICAR" : "simulação"}\n`,
  );

  let mudaram = 0;

  for (const lead of leads) {
    const diag = lead.diagnosticos[0];
    if (!diag) continue;

    const novas = detectarDores(diag, lead.website, lead.telefone);
    const antes = lead.dores.map((d) => d.tipo).sort().join(",");
    const depois = novas.map((d) => d.tipo).sort().join(",");
    if (antes === depois) continue;

    mudaram++;
    const ganhou = novas.filter((n) => !lead.dores.some((d) => d.tipo === n.tipo));
    // A evidência tem que dizer QUAL regra disparou. Imprimir o tempo em toda
    // linha fazia parecer que um Lead com `perf=45` e 1800ms tinha ganhado a
    // Dor pelo tempo, quando ela veio da regra antiga do PageSpeed.
    const evidencia =
      diag.performance_mobile !== null
        ? `psi ${diag.performance_mobile}`
        : diag.tempo_carregamento_ms !== null
          ? `${diag.tempo_carregamento_ms}ms`
          : "sem medição";
    console.log(
      `  ${lead.nome.slice(0, 38).padEnd(40)} ${evidencia.padEnd(12)}` +
        `+[${ganhou.map((g) => `${g.tipo}/${g.severidade}`).join(" ")}]`,
    );

    if (APLICAR) {
      await substituirDoresDoLead(user.id, lead.id, novas);
      const r = await recalcularScore(user.id, lead.id);
      if (r && r.score !== lead.score) {
        console.log(`      score ${lead.score} → ${r.score}`);
      }
    }
  }

  console.log(`\n${mudaram} Lead(s) com conjunto de Dores diferente`);
  if (!APLICAR && mudaram > 0) {
    console.log("rode de novo com --aplicar pra gravar");
  }
}

main()
  .catch((e) => {
    console.error("FALHOU:", e instanceof Error ? e.stack : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
