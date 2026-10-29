// F043 — promove e-mail a admin (one-shot).
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const email = (process.argv[2] ?? "").trim().toLowerCase();
if (!email.includes("@")) {
  console.error("Uso: npx tsx scripts/promover-admin-f043.mts <email>");
  process.exit(1);
}

const prisma = new PrismaClient();

const user = await prisma.user.findFirst({
  where: { email: { equals: email, mode: "insensitive" } },
  select: { id: true, email: true, role: true },
});

if (!user) {
  console.log("USER_NOT_FOUND", email);
  await prisma.$disconnect();
  process.exit(2);
}

const updated = await prisma.user.update({
  where: { id: user.id },
  data: { role: "admin" },
  select: { id: true, email: true, role: true },
});
console.log(updated);
await prisma.$disconnect();
