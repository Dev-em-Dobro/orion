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

type OfertaHubla = { id?: string };
type ProdutoComOfertas = { offers?: OfertaHubla[] };

export function offerIdsDoEvento(event: {
  product?: ProdutoComOfertas;
  products?: ProdutoComOfertas[];
}): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const add = (raw?: string) => {
    const id = raw?.trim();
    if (!id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  for (const offer of event.product?.offers ?? []) add(offer.id);
  for (const product of event.products ?? []) {
    for (const offer of product.offers ?? []) add(offer.id);
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
