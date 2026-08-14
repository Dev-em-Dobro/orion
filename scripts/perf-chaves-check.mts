// Sonda: o usuário tem chave Google utilizável (BYOK no banco ou Orion no env)?
// Não imprime a chave — só se existe e por qual caminho.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const EMAIL = process.argv[2] ?? "devemdobro@gmail.com";

async function main() {
  const user = await prisma.user.findUnique({ where: { email: EMAIL } });
  if (!user) {
    console.log(`usuário ${EMAIL} não existe`);
    return;
  }
  console.log(`usuário: ${user.id}`);

  const k = await prisma.userApiKeys.findUnique({ where: { user_id: user.id } });
  if (!k) {
    console.log("  UserApiKeys: nenhuma linha (modo orion, sem BYOK)");
  } else {
    console.log(`  modo: ${k.key_mode} · provider LLM: ${k.llm_provider}`);
    console.log(
      `  google: ${k.google_status}${k.google_last4 ? ` (…${k.google_last4})` : ""}`,
    );
    console.log(`  anthropic: ${k.anthropic_status} · openai: ${k.openai_status}`);
  }

  for (const env of ["ORION_GOOGLE_API_KEY", "ORION_OPENAI_API_KEY"]) {
    console.log(`  ${env}: ${process.env[env]?.trim() ? "presente" : "AUSENTE"}`);
  }
}

main()
  .catch((e) => {
    console.error("FALHOU:", e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
