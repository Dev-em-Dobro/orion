// F019.1 — product id Hubla do ambiente.

export function productIdHubla(): string | null {
  return process.env.HUBLA_PRODUCT_ID?.trim() || null;
}

/** Checkout público do Builders Club (oferta não-aluno). */
export function urlCheckoutBuildersClub(): string | null {
  return process.env.HUBLA_CHECKOUT_URL?.trim() || null;
}
