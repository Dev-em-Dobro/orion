// F043 — lista unificada para a aba Alunos / Allowlist.

import { prisma } from "@/lib/db";
import { normalizarEmailHubla } from "@/lib/hubla";
import { productIdsAcessoCompra } from "@/lib/tmb";
import { mapaProdutoPlano, planoDosEntitlements } from "@/lib/planos/resolver";
import {
  entitlementPlanoVigente,
  idProdutoCortesiaPro,
  isoDateEmSaoPaulo,
} from "@/lib/planos/trial";
import type { Plano } from "@/lib/planos/catalogo";
import { productIdGrantAcesso } from "./product-acesso";

export type FiltroAlunosAdmin =
  | "todos"
  | "trial"
  | "sem_login"
  | "sem_ativacao";

export type AlunoAdminRow = {
  email: string;
  userId: string | null;
  name: string | null;
  temConta: boolean;
  ativadoEm: Date | null;
  ultimoLoginEm: Date | null;
  plano: Plano;
  acessoAtivo: boolean;
  trialAtivo: boolean;
  trialExpiresAt: Date | null;
  trialExpiresIso: string | null;
};

type EntRow = {
  email: string;
  product_id: string;
  status: "ativo" | "revogado";
  expires_at: Date | null;
};

function montarRow(
  email: string,
  user: {
    id: string;
    name: string;
    purchaseVerifiedAt: Date | null;
    sessions: Array<{ updatedAt: Date; createdAt: Date }>;
  } | null,
  ents: EntRow[],
  idsAcesso: string[],
  trialProductId: string | null,
  mapa: ReturnType<typeof mapaProdutoPlano>,
  agora: Date,
): AlunoAdminRow {
  const ativos = ents.filter((e) => e.status === "ativo");
  const acessoAtivo = ativos.some((e) => idsAcesso.includes(e.product_id));
  const trialRow = trialProductId
    ? ativos.find((e) => e.product_id === trialProductId)
    : undefined;
  const trialAtivo = Boolean(
    trialRow &&
      entitlementPlanoVigente(
        { product_id: trialRow.product_id, expires_at: trialRow.expires_at },
        agora,
      ),
  );
  const productIdsPlano = ativos
    .filter((e) =>
      entitlementPlanoVigente(
        { product_id: e.product_id, expires_at: e.expires_at },
        agora,
      ),
    )
    .map((e) => e.product_id);
  const sess = user?.sessions[0];
  const ultimoLoginEm = sess
    ? sess.updatedAt > sess.createdAt
      ? sess.updatedAt
      : sess.createdAt
    : null;

  return {
    email,
    userId: user?.id ?? null,
    name: user?.name ?? null,
    temConta: Boolean(user),
    ativadoEm: user?.purchaseVerifiedAt ?? null,
    ultimoLoginEm,
    plano: planoDosEntitlements(mapa, productIdsPlano),
    acessoAtivo,
    trialAtivo,
    trialExpiresAt: trialAtivo ? (trialRow?.expires_at ?? null) : null,
    trialExpiresIso:
      trialAtivo && trialRow?.expires_at
        ? isoDateEmSaoPaulo(trialRow.expires_at)
        : null,
  };
}

export async function listAlunosAdmin(opts?: {
  q?: string;
  filtro?: FiltroAlunosAdmin;
  limit?: number;
}): Promise<AlunoAdminRow[]> {
  const q = opts?.q?.trim().toLowerCase() || undefined;
  const filtro = opts?.filtro ?? "todos";
  const limit = Math.min(Math.max(opts?.limit ?? 100, 1), 300);
  const idsAcesso = productIdsAcessoCompra();
  const trialProductId = idProdutoCortesiaPro();
  const mapa = mapaProdutoPlano();
  const agora = new Date();

  const productFilter = [
    ...(idsAcesso.length > 0 ? idsAcesso : []),
    ...(trialProductId ? [trialProductId] : []),
  ];

  const users = await prisma.user.findMany({
    where: q
      ? {
          OR: [
            { email: { contains: q, mode: "insensitive" } },
            { purchaseEmail: { contains: q, mode: "insensitive" } },
          ],
        }
      : undefined,
    select: {
      id: true,
      name: true,
      email: true,
      purchaseEmail: true,
      purchaseVerifiedAt: true,
      sessions: {
        orderBy: { updatedAt: "desc" },
        take: 1,
        select: { updatedAt: true, createdAt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  const emailsUsers = new Set<string>();
  for (const u of users) {
    const a = normalizarEmailHubla(u.email);
    const b = u.purchaseEmail ? normalizarEmailHubla(u.purchaseEmail) : null;
    if (a) emailsUsers.add(a);
    if (b) emailsUsers.add(b);
  }

  const entitlementsSemUser = productFilter.length
    ? await prisma.hublaEntitlement.findMany({
        where: {
          status: "ativo",
          product_id: { in: productFilter },
          AND: [
            ...(q
              ? [{ email: { contains: q, mode: "insensitive" as const } }]
              : []),
            ...(emailsUsers.size > 0
              ? [{ email: { notIn: [...emailsUsers] } }]
              : []),
          ],
        },
        orderBy: { granted_at: "desc" },
        take: limit,
        select: {
          email: true,
          product_id: true,
          status: true,
          expires_at: true,
        },
      })
    : [];

  const emailsAlvo = [
    ...emailsUsers,
    ...entitlementsSemUser.map((e) => e.email),
  ];
  const emailsUnicos = [...new Set(emailsAlvo)];

  const entitlements =
    emailsUnicos.length === 0 || productFilter.length === 0
      ? []
      : await prisma.hublaEntitlement.findMany({
          where: {
            email: { in: emailsUnicos },
            product_id: { in: productFilter },
          },
          select: {
            email: true,
            product_id: true,
            status: true,
            expires_at: true,
          },
        });

  const entsPorEmail = new Map<string, EntRow[]>();
  for (const e of entitlements) {
    const list = entsPorEmail.get(e.email) ?? [];
    list.push(e);
    entsPorEmail.set(e.email, list);
  }

  const userPorEmail = new Map<string, (typeof users)[number]>();
  for (const u of users) {
    const login = normalizarEmailHubla(u.email);
    if (login) userPorEmail.set(login, u);
    const compra = u.purchaseEmail
      ? normalizarEmailHubla(u.purchaseEmail)
      : null;
    if (compra && !userPorEmail.has(compra)) userPorEmail.set(compra, u);
  }

  const ordem: string[] = [];
  const visto = new Set<string>();
  for (const u of users) {
    const e = normalizarEmailHubla(u.email);
    if (e && !visto.has(e)) {
      visto.add(e);
      ordem.push(e);
    }
  }
  for (const e of entitlementsSemUser) {
    if (!visto.has(e.email)) {
      visto.add(e.email);
      ordem.push(e.email);
    }
  }

  const rows: AlunoAdminRow[] = [];
  for (const email of ordem) {
    const row = montarRow(
      email,
      userPorEmail.get(email) ?? null,
      entsPorEmail.get(email) ?? [],
      idsAcesso,
      trialProductId,
      mapa,
      agora,
    );
    if (filtro === "trial" && !row.trialAtivo) continue;
    if (filtro === "sem_login" && row.temConta) continue;
    if (filtro === "sem_ativacao" && (row.ativadoEm || !row.temConta)) continue;
    rows.push(row);
    if (rows.length >= limit) break;
  }

  return rows;
}

export async function listAllowlistRecente(limit = 50) {
  let productId: string;
  try {
    productId = productIdGrantAcesso();
  } catch {
    return [];
  }
  return prisma.hublaEntitlement.findMany({
    where: { product_id: productId, status: "ativo" },
    orderBy: { granted_at: "desc" },
    take: limit,
    select: {
      email: true,
      product_id: true,
      granted_at: true,
      status: true,
    },
  });
}
