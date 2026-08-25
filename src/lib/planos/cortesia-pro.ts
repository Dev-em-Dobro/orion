// F035 — cortesia Pro no grant Elite (emenda 2026-08-24).
// Spec: /specs/02-features/F035-planos-e-limites.md (AC28)

import { prisma } from "@/lib/db";
import { productIdsCortesiaPro } from "@/lib/tmb/interpretar";
import {
  TRIAL_PRO_FIM_ISO,
  dataExpiracaoCortesia,
  diasCortesiaPro,
  entitlementPlanoVigente,
  idProdutoCortesiaPro,
  isoDateEmSaoPaulo,
} from "./trial";

export async function concederCortesiaPro(
  email: string,
  agora: Date = new Date(),
): Promise<"criado" | "ja_ativo" | "ignorado"> {
  const productId = idProdutoCortesiaPro();
  if (!productId) return "ignorado";

  const existente = await prisma.hublaEntitlement.findUnique({
    where: { email_product_id: { email, product_id: productId } },
  });

  if (
    existente?.status === "ativo" &&
    entitlementPlanoVigente(
      { product_id: existente.product_id, expires_at: existente.expires_at },
      agora,
    )
  ) {
    return "ja_ativo";
  }

  const expiresAt = dataExpiracaoCortesia(agora, diasCortesiaPro());
  await prisma.hublaEntitlement.upsert({
    where: { email_product_id: { email, product_id: productId } },
    create: {
      email,
      product_id: productId,
      status: "ativo",
      granted_at: agora,
      expires_at: expiresAt,
      revoked_at: null,
    },
    update: {
      status: "ativo",
      granted_at: agora,
      expires_at: expiresAt,
      revoked_at: null,
    },
  });
  return "criado";
}

/** Cortesia só se o e-mail ainda tem Elite ativo (não no PRO Club / Mentoria). */
export async function concederCortesiaProSeElite(
  email: string,
  agora: Date = new Date(),
): Promise<"criado" | "ja_ativo" | "ignorado"> {
  const ids = productIdsCortesiaPro();
  if (ids.length === 0) return "ignorado";
  const elite = await prisma.hublaEntitlement.findFirst({
    where: {
      email,
      status: "ativo",
      product_id: { in: ids },
    },
    select: { id: true },
  });
  if (!elite) return "ignorado";
  return concederCortesiaPro(email, agora);
}

export async function revogarCortesiaPro(email: string): Promise<void> {
  const productId = idProdutoCortesiaPro();
  if (!productId) return;

  await prisma.hublaEntitlement.upsert({
    where: { email_product_id: { email, product_id: productId } },
    create: {
      email,
      product_id: productId,
      status: "revogado",
      revoked_at: new Date(),
    },
    update: {
      status: "revogado",
      revoked_at: new Date(),
    },
  });
}

/** Revoga a cortesia só se não restar nenhum Elite de acesso ativo. */
export async function revogarCortesiaProSeSemAcesso(
  email: string,
): Promise<void> {
  const ids = productIdsCortesiaPro();
  if (ids.length > 0) {
    const outro = await prisma.hublaEntitlement.findFirst({
      where: {
        email,
        status: "ativo",
        product_id: { in: ids },
      },
      select: { id: true },
    });
    if (outro) return;
  }
  await revogarCortesiaPro(email);
}

export async function fimCortesiaProDoUsuario(
  userId: string,
): Promise<string | null> {
  const productId = idProdutoCortesiaPro();
  if (!productId) return null;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, purchaseEmail: true },
  });
  if (!user) return null;

  const emails = [
    ...new Set(
      [user.purchaseEmail, user.email]
        .map((e) => e?.trim().toLowerCase())
        .filter((e): e is string => Boolean(e)),
    ),
  ];
  if (emails.length === 0) return null;

  const row = await prisma.hublaEntitlement.findFirst({
    where: {
      email: { in: emails },
      product_id: productId,
      status: "ativo",
    },
    select: { product_id: true, expires_at: true },
  });
  if (!row || !entitlementPlanoVigente(row)) return null;
  if (row.expires_at) return isoDateEmSaoPaulo(row.expires_at);
  return TRIAL_PRO_FIM_ISO;
}
