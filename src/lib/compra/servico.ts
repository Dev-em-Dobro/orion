// F019.1 — verificação de compra Hubla (cache no User + HublaEntitlement).

import { prisma } from "@/lib/db";
import { normalizarEmailHubla, temEntitlementAtivo } from "@/lib/hubla";
import { productIdHubla } from "./env";
import { CompraJaVinculadaError, CompraNaoEncontradaError, CompraRequiredError } from "./erros";

export type StatusCompra = {
  verificada: boolean;
  purchaseEmail: string | null;
  purchaseVerifiedAt: Date | null;
};

type UserCompra = {
  id: string;
  email: string;
  purchaseEmail: string | null;
  purchaseVerifiedAt: Date | null;
  purchaseProductId: string | null;
};

async function carregarUserCompra(userId: string): Promise<UserCompra | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      purchaseEmail: true,
      purchaseVerifiedAt: true,
      purchaseProductId: true,
    },
  });
}

async function entitlementAtivoParaEmail(email: string): Promise<boolean> {
  const normalizado = normalizarEmailHubla(email);
  if (!normalizado) return false;
  return temEntitlementAtivo(normalizado, productIdHubla());
}

async function gravarVerificacao(
  userId: string,
  emailCompra: string,
): Promise<void> {
  const productId = productIdHubla();
  await prisma.user.update({
    where: { id: userId },
    data: {
      purchaseEmail: emailCompra,
      purchaseVerifiedAt: new Date(),
      purchaseProductId: productId,
    },
  });
}

async function limparVerificacao(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      purchaseEmail: null,
      purchaseVerifiedAt: null,
      purchaseProductId: null,
    },
  });
}

/** Tenta verificar com e-mail de login ou purchase_email já salvo. */
export async function tentarAutoVerificar(userId: string): Promise<boolean> {
  const user = await carregarUserCompra(userId);
  if (!user) return false;

  const candidatos = [
    user.purchaseEmail,
    user.email,
  ].filter((e): e is string => Boolean(e));

  for (const bruto of candidatos) {
    const email = normalizarEmailHubla(bruto);
    if (!email) continue;
    if (!(await entitlementAtivoParaEmail(email))) continue;

    const outro = await prisma.user.findFirst({
      where: {
        purchaseEmail: email,
        purchaseVerifiedAt: { not: null },
        NOT: { id: userId },
      },
      select: { id: true },
    });
    if (outro) continue;

    await gravarVerificacao(userId, email);
    return true;
  }

  return false;
}

/** Revalida cache existente; limpa se entitlement revogado. */
async function revalidarCache(user: UserCompra): Promise<boolean> {
  if (!user.purchaseVerifiedAt || !user.purchaseEmail) return false;

  const ativo = await entitlementAtivoParaEmail(user.purchaseEmail);
  if (ativo) return true;

  await limparVerificacao(user.id);
  return false;
}

export async function statusCompra(userId: string): Promise<StatusCompra> {
  const user = await carregarUserCompra(userId);
  if (!user) {
    return { verificada: false, purchaseEmail: null, purchaseVerifiedAt: null };
  }

  if (user.purchaseVerifiedAt && user.purchaseEmail) {
    const ok = await revalidarCache(user);
    if (ok) {
      return {
        verificada: true,
        purchaseEmail: user.purchaseEmail,
        purchaseVerifiedAt: user.purchaseVerifiedAt,
      };
    }
  }

  const auto = await tentarAutoVerificar(userId);
  if (auto) {
    const atualizado = await carregarUserCompra(userId);
    return {
      verificada: true,
      purchaseEmail: atualizado?.purchaseEmail ?? null,
      purchaseVerifiedAt: atualizado?.purchaseVerifiedAt ?? null,
    };
  }

  return {
    verificada: false,
    purchaseEmail: user.purchaseEmail,
    purchaseVerifiedAt: null,
  };
}

export async function usuarioTemCompraVerificada(userId: string): Promise<boolean> {
  const status = await statusCompra(userId);
  return status.verificada;
}

/** Verifica e-mail informado pelo aluno contra HublaEntitlement. */
export async function verificarCompraManual(
  userId: string,
  emailBruto: string,
): Promise<{ email: string }> {
  const email = normalizarEmailHubla(emailBruto);
  if (!email) {
    throw new CompraNaoEncontradaError("Informe um e-mail válido.");
  }

  const ativo = await entitlementAtivoParaEmail(email);
  if (!ativo) {
    throw new CompraNaoEncontradaError();
  }

  const outro = await prisma.user.findFirst({
    where: {
      purchaseEmail: email,
      purchaseVerifiedAt: { not: null },
      NOT: { id: userId },
    },
    select: { id: true },
  });
  if (outro) {
    throw new CompraJaVinculadaError();
  }

  await gravarVerificacao(userId, email);
  return { email };
}

/** Exige compra ativa; lança CompraRequiredError se pendente. */
export async function requireCompraAtiva(userId: string): Promise<void> {
  const ok = await usuarioTemCompraVerificada(userId);
  if (!ok) {
    throw new CompraRequiredError();
  }
}
