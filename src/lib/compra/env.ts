// F019.1 — product id Hubla do ambiente.

export function productIdHubla(): string | null {
  return process.env.HUBLA_PRODUCT_ID?.trim() || null;
}

/** Checkout público Elite do Builders Club (não o PRO de R$ 297). */
export function urlCheckoutBuildersClub(): string | null {
  return process.env.HUBLA_CHECKOUT_URL?.trim() || null;
}
