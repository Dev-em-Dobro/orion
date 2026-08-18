// F035 — período de teste do Pro (spec: "Período de teste do Pro (2026-08-18 → 2026-09-18)").
// Concede (ou revoga) o entitlement do teste para TODOS os alunos existentes.
//
// Uso:
//   node scripts/conceder-trial-pro.mjs --dry-run            # só mostra, não grava
//   node scripts/conceder-trial-pro.mjs                      # concede
//   node scripts/conceder-trial-pro.mjs --revogar            # encerra o teste
//
//   productId default: trial-pro-2026-09 (ou --product-id=<id>)
//
// Espelha scripts/conceder-acesso.mjs, que faz um e-mail por vez. A diferença é
// só o laço e o dry-run — a gravação é idêntica, de propósito.
//
// LEMBRETE: o interruptor real é a variável HUBLA_PRODUCT_ID_PRO na Vercel.
// Sem ela, `mapaProdutoPlano()` é vazio e TODO MUNDO é free, por mais
// entitlement que exista no banco (src/lib/planos/resolver.ts:62). Este script
// prepara o banco; quem liga e desliga o teste é a variável.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const PRODUCT_ID_PADRAO = "trial-pro-2026-09";

/** Mesma normalização de src/lib/hubla/normalizar.ts (trim + lowercase). */
function normalizarEmail(raw) {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  if (!email.includes("@")) return null;
  return email;
}

async function main() {
  const args = process.argv.slice(2);
  const revogar = args.includes("--revogar");
  const dryRun = args.includes("--dry-run");
  const productId =
    args.find((a) => a.startsWith("--product-id="))?.split("=")[1]?.trim() ||
    PRODUCT_ID_PADRAO;

  const host = (process.env.DATABASE_URL ?? "").replace(
    /.*:\/\/[^@]*@([^/?]*).*/,
    "$1",
  );
  console.log(`\nBanco:      ${host || "(DATABASE_URL ausente)"}`);
  console.log(`Produto:    ${productId}`);
  console.log(`Ação:       ${revogar ? "REVOGAR" : "CONCEDER"}${dryRun ? "  (dry-run — nada será gravado)" : ""}\n`);

  if (!host) {
    console.error("DATABASE_URL ausente. Rode com DATABASE_URL=<url> node scripts/conceder-trial-pro.mjs");
    process.exit(1);
  }

  // O plano é resolvido por e-mail: purchaseEmail vale mais que o de login, mas
  // os dois entram (resolver.ts). Concedemos ao mesmo par que ele consulta, senão
  // o aluno que comprou com outro e-mail ficaria de fora do próprio teste.
  const usuarios = await prisma.user.findMany({
    select: { id: true, email: true, purchaseEmail: true },
  });

  const emails = new Set();
  for (const u of usuarios) {
    for (const bruto of [u.purchaseEmail, u.email]) {
      const e = normalizarEmail(bruto);
      if (e) emails.add(e);
    }
  }

  console.log(`${usuarios.length} usuários → ${emails.size} e-mails distintos.\n`);

  if (dryRun) {
    [...emails].sort().forEach((e) => console.log(`  ${revogar ? "-" : "+"} ${e}`));
    console.log(`\n(dry-run) Nada gravado. Tire o --dry-run para valer.`);
    return;
  }

  const status = revogar ? "revogado" : "ativo";
  let ok = 0;
  for (const email of emails) {
    await prisma.hublaEntitlement.upsert({
      where: { email_product_id: { email, product_id: productId } },
      create: {
        email,
        product_id: productId,
        status,
        ...(revogar ? { revoked_at: new Date() } : { granted_at: new Date() }),
      },
      update: revogar
        ? { status: "revogado", revoked_at: new Date() }
        : { status: "ativo", revoked_at: null, granted_at: new Date() },
    });
    ok += 1;
  }

  const ativos = await prisma.hublaEntitlement.count({
    where: { product_id: productId, status: "ativo" },
  });

  console.log(`${ok} entitlements gravados como "${status}".`);
  console.log(`Ativos agora em ${productId}: ${ativos}`);
  console.log(
    revogar
      ? `\nTeste encerrado no banco. Se ainda não fez, apague HUBLA_PRODUCT_ID_PRO da Vercel.`
      : `\nFalta ligar: HUBLA_PRODUCT_ID_PRO=${productId} em Production na Vercel.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
