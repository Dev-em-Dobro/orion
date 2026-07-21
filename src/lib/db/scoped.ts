// F015 / ADR-008 — ponto único de escopo por tenant.
// Prefira `whereUser` / `requireLeadOwned` em vez de queries globais.

import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth/require-user";
import type { AuthUser } from "@/lib/auth";
import { AuthError } from "@/lib/auth/errors";
import { ChaveAusenteError, ChaveOperacaoError } from "@/lib/chaves/erros";
import { LlmError } from "@/lib/llm/erros";
import { CifraError } from "@/lib/seguranca/cifra";

export class TenantNotFoundError extends Error {
  constructor(recurso = "Recurso") {
    super(`${recurso} não encontrado`);
    this.name = "TenantNotFoundError";
  }
}

export type TenantContext = {
  user: AuthUser;
  userId: string;
  /** Fragmento de where: sempre `{ user_id: userId }`. */
  whereUser: { user_id: string };
};

export async function requireTenant(): Promise<TenantContext> {
  const user = await requireUser();
  return {
    user,
    userId: user.id,
    whereUser: { user_id: user.id },
  };
}

/** Mensagem amigável pra auth/tenant/BYOK em Server Actions. */
export function mensagemEscopo(e: unknown): string | null {
  if (
    e instanceof AuthError ||
    e instanceof TenantNotFoundError ||
    e instanceof ChaveAusenteError ||
    e instanceof ChaveOperacaoError ||
    e instanceof CifraError ||
    e instanceof LlmError
  ) {
    return e.message;
  }
  return null;
}

/**
 * Busca Lead pelo id **dentro do tenant**. Sem include tipado:
 * quem precisa de relações faz `findFirst` com `whereUser` depois do
 * `requireTenant()`, ou usa este helper e faz queries irmãs.
 */
export async function requireLeadOwned(leadId: string) {
  const ctx = await requireTenant();
  const lead = await prisma.lead.findFirst({
    where: { id: leadId, user_id: ctx.userId },
  });
  if (!lead) {
    throw new TenantNotFoundError("Lead");
  }
  return { ...ctx, lead };
}

export async function requireOutreachOwned(outreachId: string) {
  const ctx = await requireTenant();
  const outreach = await prisma.outreach.findFirst({
    where: { id: outreachId, user_id: ctx.userId },
    include: { lead: true },
  });
  if (!outreach) {
    throw new TenantNotFoundError("Outreach");
  }
  return { ...ctx, outreach };
}
