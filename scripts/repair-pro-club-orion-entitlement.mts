/**
 * Corrige grant Orion errado: PRO Club que ganhou cortesia trial-pro.
 *
 * Uso (prod — conferir DATABASE_URL antes):
 *   npx tsx scripts/repair-pro-club-orion-entitlement.mts jaquevaz@outlook.com.br XaY8QNfZlOO1XBgjzMfY
 */
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import { idProdutoCortesiaPro } from "../src/lib/planos/trial";

config({ path: ".env" });

const email = process.argv[2]?.trim().toLowerCase();
const offerId = process.argv[3]?.trim();
if (!email || !offerId) {
  console.error(
    "Uso: npx tsx scripts/repair-pro-club-orion-entitlement.mts <email> <offer-id-pro>",
  );
  process.exit(1);
}

const prisma = new PrismaClient();
const cortesiaId = idProdutoCortesiaPro();

async function main() {
  const antes = await prisma.hublaEntitlement.findMany({ where: { email } });
  console.log("Antes:", antes);

  if (cortesiaId) {
    await prisma.hublaEntitlement.updateMany({
      where: { email, product_id: cortesiaId, status: "ativo" },
      data: { status: "revogado", revoked_at: new Date() },
    });
  } else {
    await prisma.hublaEntitlement.updateMany({
      where: {
        email,
        status: "ativo",
        product_id: { startsWith: "trial-pro" },
      },
      data: { status: "revogado", revoked_at: new Date() },
    });
  }

  await prisma.hublaEntitlement.updateMany({
    where: { email, product_id: "VL3e0iDO3A32SyjJWr9S", status: "ativo" },
    data: { status: "revogado", revoked_at: new Date() },
  });

  await prisma.hublaEntitlement.upsert({
    where: { email_product_id: { email, product_id: offerId } },
    create: {
      email,
      product_id: offerId,
      status: "ativo",
      granted_at: new Date(),
    },
    update: {
      status: "ativo",
      revoked_at: null,
      granted_at: new Date(),
    },
  });

  const depois = await prisma.hublaEntitlement.findMany({ where: { email } });
  console.log("Depois:", depois);
}

main().finally(async () => {
  await prisma.$disconnect();
});
