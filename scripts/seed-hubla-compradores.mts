// Importa compradores Builders Club em HublaEntitlement (idempotente).
// Rodar: npm run db:seed:hubla
// Requer DATABASE_URL e, opcionalmente, HUBLA_PRODUCT_ID no .env.

import { PrismaClient } from "@prisma/client";
import {
  COMPRADORES_HUBLA,
  HUBLA_PRODUCT_ID_BUILDERS_CLUB,
  type CompradorHubla,
} from "./data/hubla-compradores.ts";

const prisma = new PrismaClient();

/** DD/MM/YYYY HH:mm:ss em horário de Brasília. */
export function parsePagoEmBrasilia(pagoEm: string): Date {
  const [datePart, timePart] = pagoEm.trim().split(/\s+/);
  const [dia, mes, ano] = datePart.split("/");
  return new Date(`${ano}-${mes}-${dia}T${timePart}-03:00`);
}

function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

function deduplicar(compradores: CompradorHubla[]): CompradorHubla[] {
  const porEmail = new Map<string, CompradorHubla>();
  for (const row of compradores) {
    const email = normalizarEmail(row.email);
    if (!email) continue;
    porEmail.set(email, { email, pagoEm: row.pagoEm });
  }
  return [...porEmail.values()];
}

async function upsertComprador(
  productId: string,
  comprador: CompradorHubla,
): Promise<"criado" | "atualizado"> {
  const email = normalizarEmail(comprador.email);
  const grantedAt = parsePagoEmBrasilia(comprador.pagoEm);

  const existente = await prisma.hublaEntitlement.findUnique({
    where: { email_product_id: { email, product_id: productId } },
    select: { id: true },
  });

  await prisma.hublaEntitlement.upsert({
    where: { email_product_id: { email, product_id: productId } },
    create: {
      email,
      product_id: productId,
      status: "ativo",
      granted_at: grantedAt,
    },
    update: {
      status: "ativo",
      granted_at: grantedAt,
      revoked_at: null,
    },
  });

  return existente ? "atualizado" : "criado";
}

/** Marca compra verificada em contas já criadas (mesmo e-mail de login). */
async function ativarContasExistentes(
  productId: string,
  emails: string[],
): Promise<number> {
  let ativados = 0;

  for (const email of emails) {
    const user = await prisma.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, purchaseVerifiedAt: true },
    });
    if (!user || user.purchaseVerifiedAt) continue;

    await prisma.user.update({
      where: { id: user.id },
      data: {
        purchaseEmail: email,
        purchaseVerifiedAt: new Date(),
        purchaseProductId: productId,
      },
    });
    ativados += 1;
  }

  return ativados;
}

async function main() {
  const productId =
    process.env.HUBLA_PRODUCT_ID?.trim() || HUBLA_PRODUCT_ID_BUILDERS_CLUB;
  const compradores = deduplicar(COMPRADORES_HUBLA);
  const emails = compradores.map((c) => normalizarEmail(c.email));

  let criados = 0;
  let atualizados = 0;

  for (const comprador of compradores) {
    const resultado = await upsertComprador(productId, comprador);
    if (resultado === "criado") criados += 1;
    else atualizados += 1;
  }

  const contasAtivadas = await ativarContasExistentes(productId, emails);

  console.log(
    JSON.stringify(
      {
        productId,
        total: compradores.length,
        criados,
        atualizados,
        contasAtivadas,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
