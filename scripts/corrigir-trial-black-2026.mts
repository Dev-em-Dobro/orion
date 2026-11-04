/** F042 — corrige a cortesia das compras Black de 28/10 a 04/11/2026. */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { HUBLA_PRODUCT_ID_BLACK_FRIDAY } from "../src/lib/hubla/produtos";
import { dataExpiracaoCortesiaAnual } from "../src/lib/planos/trial";

const aplicar = process.argv.includes("--apply");
const inicio = new Date("2026-10-28T00:00:00-03:00");
const fimExclusivo = new Date("2026-11-05T00:00:00-03:00");
const trialId = process.env.HUBLA_PRODUCT_ID_PRO?.split(",")[0]?.trim() || "trial-pro-2026-11";

if (!trialId.startsWith("trial-pro-") || !process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL e HUBLA_PRODUCT_ID_PRO sintético são necessários");
}

const prisma = new PrismaClient();
try {
  const acessos = await prisma.hublaEntitlement.findMany({
    where: {
      product_id: HUBLA_PRODUCT_ID_BLACK_FRIDAY,
      status: "ativo",
      granted_at: { gte: inicio, lt: fimExclusivo },
    },
    select: { email: true, granted_at: true, subscription_id: true },
    orderBy: { granted_at: "asc" },
  });

  let testes = 0;
  let semTrial = 0;
  let jaCorretos = 0;
  let corrigidos = 0;
  for (const acesso of acessos) {
    if (acesso.subscription_id?.endsWith("-tester")) {
      testes++;
      continue;
    }
    const trial = await prisma.hublaEntitlement.findUnique({
      where: { email_product_id: { email: acesso.email, product_id: trialId } },
      select: { id: true, status: true, expires_at: true },
    });
    if (!trial || trial.status !== "ativo") {
      semTrial++;
      continue;
    }
    const novoFim = dataExpiracaoCortesiaAnual(acesso.granted_at);
    if (trial.expires_at && trial.expires_at >= novoFim) {
      jaCorretos++;
      continue;
    }
    console.log(`${acesso.email}  ${trial.expires_at?.toISOString() ?? "sem prazo"} -> ${novoFim.toISOString()}`);
    if (aplicar) {
      const resultado = await prisma.hublaEntitlement.updateMany({
        where: {
          id: trial.id,
          status: "ativo",
          OR: [{ expires_at: null }, { expires_at: { lt: novoFim } }],
        },
        data: { expires_at: novoFim },
      });
      if (resultado.count !== 1) throw new Error(`Trial alterado durante a correção: ${acesso.email}`);
    }
    corrigidos++;
  }
  console.log(JSON.stringify({ modo: aplicar ? "aplicado" : "prévia", acessos: acessos.length, testes, semTrial, jaCorretos, corrigidos }));
} finally {
  await prisma.$disconnect();
}
