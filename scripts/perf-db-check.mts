// Sonda de ambiente pro relatório de performance: o banco responde, e com que
// volume? Sem isto um número de latência de página não significa nada — 200ms
// numa base vazia não diz se a tela aguenta 5 mil Leads.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const p = new PrismaClient();

async function main() {
  const t0 = Date.now();
  const users = await p.user.count();
  console.log(`ida-e-volta do banco: ${Date.now() - t0} ms`);

  const [leads, diag, dores, abordagens, sessoes] = await Promise.all([
    p.lead.count(),
    p.diagnostico.count(),
    p.dor.count(),
    p.abordagem.count(),
    p.session.count(),
  ]);
  console.log(
    `users=${users} leads=${leads} diagnosticos=${diag} dores=${dores} abordagens=${abordagens} sessoes=${sessoes}`,
  );

  const lista = await p.user.findMany({
    select: { id: true, email: true, purchaseVerifiedAt: true },
    take: 20,
  });
  for (const u of lista) {
    const n = await p.lead.count({ where: { user_id: u.id } });
    console.log(
      `  ${u.id}  ${u.email}  leads=${n}  compra=${u.purchaseVerifiedAt ? "ok" : "-"}`,
    );
  }
}

main()
  .catch((e) => {
    console.error("FALHOU:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => void p.$disconnect());
