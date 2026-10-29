/** Normaliza e-mail para lookup (lowercase, trim). */
export function normalizarEmailHubla(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const email = raw.trim().toLowerCase();
  if (!email.includes("@")) return null;
  return email;
}

export function productIdDoEvento(event: {
  product?: { id?: string };
  products?: { id?: string }[];
}): string | null {
  const top = event.product?.id?.trim() || null;
  const nested = event.products?.[0]?.id?.trim() || null;
  // Black Infinita: product.id = offer slug; catalog fica em products[0].id.
  if (top && nested && top !== nested) return nested;
  return top || nested;
}

type OfertaHubla = { id?: string; isOrderBump?: boolean };
type ProdutoComOfertas = { offers?: OfertaHubla[] };

/** Oferta comprada em `products[].offers` (não o catálogo em `product.offers`). */
export function offerIdsDoEvento(event: {
  product?: ProdutoComOfertas;
  products?: ProdutoComOfertas[];
}): string[] {
  const ofertas: { id: string; isOrderBump: boolean }[] = [];
  const seen = new Set<string>();
  const add = (offer?: OfertaHubla) => {
    const id = offer?.id?.trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    ofertas.push({ id, isOrderBump: offer?.isOrderBump === true });
  };

  for (const product of event.products ?? []) {
    for (const offer of product.offers ?? []) add(offer);
  }
  if (ofertas.length === 0) {
    for (const offer of event.product?.offers ?? []) add(offer);
  }

  const principais = ofertas.filter((o) => !o.isOrderBump);
  const ids = (principais.length > 0 ? principais : ofertas).map((o) => o.id);

  // Se product.id ≠ products[0].id, o top costuma ser o offer comprado.
  const top = (event as { product?: { id?: string } }).product?.id?.trim();
  const nested = (event as { products?: { id?: string }[] }).products?.[0]?.id?.trim();
  if (top && nested && top !== nested && !ids.includes(top)) {
    ids.unshift(top);
  }
  return ids;
}

export function emailDoEvento(event: HublaWebhookEventLike): string | null {
  return (
    normalizarEmailHubla(event.user?.email) ??
    normalizarEmailHubla(event.subscription?.payer?.email) ??
    normalizarEmailHubla(event.invoice?.user?.email) ??
    normalizarEmailHubla(event.invoice?.payer?.email)
  );
}

type HublaWebhookEventLike = {
  user?: { email?: string };
  subscription?: { payer?: { email?: string } };
  invoice?: { user?: { email?: string }; payer?: { email?: string } };
};
