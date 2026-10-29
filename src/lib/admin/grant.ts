// F043 — grant/revoke acesso e trial Pro (UI admin).

import { prisma } from "@/lib/db";
import { normalizarEmailHubla } from "@/lib/hubla";
import {
  concederCortesiaPro,
  revogarCortesiaPro,
} from "@/lib/planos/cortesia-pro";
import {
  dataExpiracaoCortesia,
  diasCortesiaPro,
  entitlementPlanoVigente,
  idProdutoCortesiaPro,
} from "@/lib/planos/trial";
import { productIdGrantAcesso } from "./product-acesso";

function emailOuErro(bruto: string): string {
  const email = normalizarEmailHubla(bruto);
  if (!email) throw new Error("Informe um e-mail válido.");
  return email;
}

async function promoverUserSeLivre(
  email: string,
  productId: string,
): Promise<"promovido" | "ja_vinculado" | "sem_conta"> {
  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, purchaseVerifiedAt: true },
  });
  if (!user) return "sem_conta";

  const outro = await prisma.user.findFirst({
    where: {
      purchaseEmail: email,
      purchaseVerifiedAt: { not: null },
      NOT: { id: user.id },
    },
    select: { id: true },
  });
  if (outro) return "ja_vinculado";

  await prisma.user.update({
    where: { id: user.id },
    data: {
      purchaseEmail: email,
      purchaseVerifiedAt: new Date(),
      purchaseProductId: productId,
    },
  });
  return "promovido";
}

async function limparVerificacaoDoEmail(email: string): Promise<void> {
  await prisma.user.updateMany({
    where: { purchaseEmail: email },
    data: {
      purchaseEmail: null,
      purchaseVerifiedAt: null,
      purchaseProductId: null,
    },
  });
}

export type GrantAcessoResult = {
  email: string;
  productId: string;
  user: "promovido" | "ja_vinculado" | "sem_conta";
  trial: "criado" | "ja_ativo" | "ignorado" | "nao_pedido";
};

export async function grantAcessoAdmin(
  emailBruto: string,
  opts: { comTrial?: boolean } = {},
): Promise<GrantAcessoResult> {
  const email = emailOuErro(emailBruto);
  const productId = productIdGrantAcesso();
  const agora = new Date();

  await prisma.hublaEntitlement.upsert({
    where: { email_product_id: { email, product_id: productId } },
    create: {
      email,
      product_id: productId,
      status: "ativo",
      granted_at: agora,
      revoked_at: null,
    },
    update: {
      status: "ativo",
      granted_at: agora,
      revoked_at: null,
    },
  });

  const user = await promoverUserSeLivre(email, productId);

  let trial: GrantAcessoResult["trial"] = "nao_pedido";
  if (opts.comTrial) {
    trial = await concederCortesiaPro(email, agora);
  }

  return { email, productId, user, trial };
}

export async function revokeAcessoAdmin(emailBruto: string): Promise<void> {
  const email = emailOuErro(emailBruto);
  const productId = productIdGrantAcesso();
  const agora = new Date();

  await prisma.hublaEntitlement.upsert({
    where: { email_product_id: { email, product_id: productId } },
    create: {
      email,
      product_id: productId,
      status: "revogado",
      revoked_at: agora,
    },
    update: {
      status: "revogado",
      revoked_at: agora,
    },
  });

  await limparVerificacaoDoEmail(email);
}

export async function grantTrialAdmin(
  emailBruto: string,
): Promise<"criado" | "ja_ativo" | "ignorado"> {
  return concederCortesiaPro(emailOuErro(emailBruto));
}

export async function revokeTrialAdmin(emailBruto: string): Promise<void> {
  await revogarCortesiaPro(emailOuErro(emailBruto));
}

/**
 * Empurra `expires_at` a partir do fim vigente (ou agora se expirado/ausente).
 * Diferente de conceder: sempre reescreve a janela.
 */
export async function estenderTrialAdmin(
  emailBruto: string,
  dias: number = diasCortesiaPro(),
): Promise<{ expiresAt: Date }> {
  const email = emailOuErro(emailBruto);
  const productId = idProdutoCortesiaPro();
  if (!productId) {
    throw new Error(
      "Trial Pro indisponível: HUBLA_PRODUCT_ID_PRO precisa começar com trial-pro-.",
    );
  }
  if (!Number.isInteger(dias) || dias <= 0) {
    throw new Error("Dias de extensão inválidos.");
  }

  const agora = new Date();
  const existente = await prisma.hublaEntitlement.findUnique({
    where: { email_product_id: { email, product_id: productId } },
  });

  const base =
    existente?.status === "ativo" &&
    entitlementPlanoVigente(
      { product_id: existente.product_id, expires_at: existente.expires_at },
      agora,
    ) &&
    existente.expires_at
      ? existente.expires_at
      : agora;

  const expiresAt = dataExpiracaoCortesia(base, dias);
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
      expires_at: expiresAt,
      revoked_at: null,
    },
  });

  return { expiresAt };
}

/** Parseia linhas/vírgulas/pontos-e-vírgulas em e-mails únicos. */
export function parseEmailsBulk(texto: string): string[] {
  const vistos = new Set<string>();
  const out: string[] = [];
  for (const parte of texto.split(/[\s,;]+/)) {
    const email = normalizarEmailHubla(parte);
    if (!email || vistos.has(email)) continue;
    vistos.add(email);
    out.push(email);
  }
  return out;
}

export async function grantAcessoBulkAdmin(
  texto: string,
  opts: { comTrial?: boolean } = {},
): Promise<{ ok: GrantAcessoResult[]; erros: Array<{ email: string; erro: string }> }> {
  const emails = parseEmailsBulk(texto);
  const ok: GrantAcessoResult[] = [];
  const erros: Array<{ email: string; erro: string }> = [];
  for (const email of emails) {
    try {
      ok.push(await grantAcessoAdmin(email, opts));
    } catch (e) {
      erros.push({
        email,
        erro: e instanceof Error ? e.message : "Falha ao conceder.",
      });
    }
  }
  return { ok, erros };
}
