// F035 — de onde vem o plano do aluno.
// Spec: /specs/02-features/F035-planos-e-limites.md ("Fonte do plano: Hubla")
//
// O plano é **derivado** dos HublaEntitlement ativos que a F019 já grava. Sem
// coluna em User: uma coluna seria um segundo lugar pra verdade morar, e
// dessincronizaria na primeira revogação.

import { cache } from "react";
import { prisma } from "@/lib/db";
import { normalizarEmailHubla } from "@/lib/hubla";
import { asPlano, melhorPlano, type Plano } from "./catalogo";
import { entitlementPlanoVigente } from "./trial";

/**
 * `product_id` da Hubla → plano. Vazio enquanto os IDs não forem criados na
 * Hubla: nesse estado todo mundo é `free`, que é o comportamento correto (não
 * existe plano pago configurado ainda), não uma falha.
 */
export function mapaProdutoPlano(): Map<string, Plano> {
  const mapa = new Map<string, Plano>();
  const fontes: Array<[Plano, string | undefined]> = [
    ["pro", process.env.HUBLA_PRODUCT_ID_PRO],
    ["agencia", process.env.HUBLA_PRODUCT_ID_AGENCIA],
  ];
  for (const [plano, bruto] of fontes) {
    for (const id of (bruto ?? "").split(",")) {
      const limpo = id.trim();
      if (limpo) mapa.set(limpo, plano);
    }
  }
  return mapa;
}

/** Checkout da Hubla por plano, pra `/planos`. */
export function urlCheckoutPlano(plano: Plano): string | null {
  const bruto =
    plano === "pro"
      ? process.env.HUBLA_CHECKOUT_URL_PRO
      : plano === "agencia"
        ? process.env.HUBLA_CHECKOUT_URL_AGENCIA
        : null;
  return bruto?.trim() || null;
}

/** Puro: dado o mapa e os product_ids ativos, qual plano vale. */
export function planoDosEntitlements(
  mapa: Map<string, Plano>,
  productIds: readonly string[],
): Plano {
  const planos = productIds
    .map((id) => mapa.get(id.trim()))
    .filter((p): p is Plano => Boolean(p));
  return melhorPlano(planos);
}

/**
 * Plano do usuário. Memoizado por request (`cache`): sidebar, gates e banners
 * consultam na mesma renderização, e sem isso viraria N queries por página
 * ([F028](/specs/02-features/F028-desempenho.md)).
 */
export const planoDoUsuario = cache(async (userId: string): Promise<Plano> => {
  const mapa = mapaProdutoPlano();
  if (mapa.size === 0) return "free";

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, purchaseEmail: true },
  });
  if (!user) return "free";

  // O e-mail da compra vale mais que o de login (o aluno pode ter comprado com
  // outro), mas os dois entram: quem comprou com o e-mail de login também tem.
  const emails = [user.purchaseEmail, user.email]
    .map((e) => (e ? normalizarEmailHubla(e) : null))
    .filter((e): e is string => Boolean(e));
  if (emails.length === 0) return "free";

  const ativos = await prisma.hublaEntitlement.findMany({
    where: {
      email: { in: [...new Set(emails)] },
      status: "ativo",
      product_id: { in: [...mapa.keys()] },
    },
    select: { product_id: true, expires_at: true },
  });

  return planoDosEntitlements(
    mapa,
    ativos
      .filter((e) => entitlementPlanoVigente(e))
      .map((e) => e.product_id),
  );
});

/** BYOK vale pro bônus só se o aluno realmente escolheu as chaves dele. */
export const usuarioEmByok = cache(async (userId: string): Promise<boolean> => {
  const chaves = await prisma.userApiKeys.findUnique({
    where: { user_id: userId },
    select: { key_mode: true },
  });
  return chaves?.key_mode === "byok";
});

export { asPlano };
