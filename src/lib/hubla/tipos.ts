// Tipos do webhook Hubla v2 (F019).

export type HublaWebhookPayload = {
  type?: string;
  version?: string;
  event?: HublaWebhookEvent;
};

export type HublaWebhookEvent = {
  product?: { id?: string; name?: string };
  products?: { id?: string; name?: string }[];
  user?: {
    id?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
  };
  subscription?: {
    id?: string;
    status?: string;
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
      hublaUserId?: string;
      subscriptionId?: string;
    }
  | { acao: "revogar"; email: string; productId: string }
  | { acao: "ignorar"; motivo: string };

export const EVENTOS_CONCEDER = new Set(["customer.member_added"]);
export const EVENTOS_REVOGAR = new Set([
  "customer.member_removed",
  "invoice.refunded",
]);
