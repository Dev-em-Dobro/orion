// F019.1 — grant manual de acesso Builders Club (entitlement Hubla "ativo").
// Uso: node scripts/conceder-acesso.mjs <email> [productId] [--revogar]
//   productId default: process.env.HUBLA_PRODUCT_ID
// Espelha aplicarAcaoEntitlement("conceder"|"revogar") de src/lib/hubla/repositorio.ts.
// Para compradores fora do fluxo do webhook ou acessos de cortesia.

import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

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
  const posicionais = args.filter((a) => !a.startsWith("--"));
  const email = normalizarEmail(posicionais[0]);
  const productId = (posicionais[1] ?? process.env.HUBLA_PRODUCT_ID)?.trim();

  if (!email) {
    console.error("Uso: node scripts/conceder-acesso.mjs <email> [productId] [--revogar]");
    process.exit(1);
  }
  if (!productId) {
    console.error("HUBLA_PRODUCT_ID ausente no .env e productId não informado.");
    process.exit(1);
  }

  const status = revogar ? "revogado" : "ativo";
  const row = await prisma.hublaEntitlement.upsert({
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

  console.log(`Entitlement ${row.status}:`, {
    email: row.email,
    product_id: row.product_id,
    granted_at: row.granted_at,
    revoked_at: row.revoked_at,
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
