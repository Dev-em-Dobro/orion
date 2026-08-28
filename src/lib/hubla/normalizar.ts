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
  const id = event.product?.id?.trim();
  if (id) return id;
  const primeiro = event.products?.[0]?.id?.trim();
  return primeiro || null;
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
  return (principais.length > 0 ? principais : ofertas).map((o) => o.id);
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
