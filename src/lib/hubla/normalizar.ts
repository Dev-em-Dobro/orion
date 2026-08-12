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
