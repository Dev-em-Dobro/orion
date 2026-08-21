// Conferência pós-import: o que entrou, com que contato, e o que está óbvio
// demais de errado pra ficar. Só lê e reporta — remover é `--remover <id>`.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EMAIL = process.env.PERF_EMAIL ?? "devemdobro@gmail.com";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) throw new Error(`usuário ${EMAIL} não existe`);

  const remover = process.argv.indexOf("--remover");
  if (remover !== -1) {
    const alvo = process.argv[remover + 1];
    if (!alvo) throw new Error("--remover precisa do nome (ou parte dele)");
    const achados = await prisma.lead.findMany({
      where: {
        user_id: user.id,
        nome: { contains: alvo, mode: "insensitive" },
      },
      select: { id: true, nome: true },
    });
    for (const l of achados) {
      await prisma.lead.delete({ where: { id: l.id } });
      console.log(`removido: ${l.nome}`);
    }
    if (achados.length === 0) console.log(`nada casou com "${alvo}"`);
    return;
  }

  const leads = await prisma.lead.findMany({
    where: { user_id: user.id },
    orderBy: [{ score: "desc" }, { nome: "asc" }],
    select: {
      nome: true,
      categoria: true,
      telefone: true,
      website: true,
      score: true,
      status: true,
    },
  });

  console.log(`${leads.length} Leads na base de ${EMAIL}\n`);

  const semTelefone = leads.filter((l) => !l.telefone);
  const semSite = leads.filter((l) => !l.website);

  console.log(
    `${leads.length - semTelefone.length} com telefone · ${leads.length - semSite.length} com site\n`,
  );

  console.log("por categoria do Places:");
  const porCategoria = new Map<string, number>();
  for (const l of leads) {
    porCategoria.set(l.categoria, (porCategoria.get(l.categoria) ?? 0) + 1);
  }
  for (const [cat, n] of [...porCategoria].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${String(n).padStart(3)}  ${cat}`);
  }

  console.log("\nsem telefone (não dá pra ligar):");
  for (const l of semTelefone) console.log(`  - ${l.nome}`);

  console.log("\nsem site (o argumento mais forte da abordagem):");
  for (const l of semSite) console.log(`  - ${l.nome}`);
}

main()
  .catch((e) => {
    console.error("FALHOU:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
