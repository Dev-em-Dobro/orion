// Tipos do webhook Hubla v2 (F019).

export type HublaWebhookPayload = {
  type?: string;
  version?: string;
  event?: HublaWebhookEvent;
};

export type HublaWebhookOffer = { id?: string; name?: string };

export type HublaWebhookProduct = {
  id?: string;
  name?: string;
  offers?: HublaWebhookOffer[];
};

export type HublaWebhookEvent = {
  product?: HublaWebhookProduct;
  products?: HublaWebhookProduct[];
  user?: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  subscription?: {
    id?: string;
    status?: string;
    type?: string;
    payer?: { email?: string; id?: string };
  };
  invoice?: {
    status?: string;
    payer?: { email?: string };
    user?: { email?: string };
  };
};

export type AcaoEntitlement =
  | {
      acao: "conceder";
      email: string;
      productId: string;
      chaveEntitlement: string;
      cortesiaPro: boolean;
      hublaUserId?: string;
      subscriptionId?: string;
    }
  | {
      acao: "revogar";
      email: string;
      productId: string;
      chavesEntitlement: string[];
    }
  | { acao: "ignorar"; motivo: string };

export const EVENTOS_CONCEDER = new Set(["customer.member_added"]);
export const EVENTOS_REVOGAR = new Set([
  "customer.member_removed",
  "invoice.refunded",
]);
