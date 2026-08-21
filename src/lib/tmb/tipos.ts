// F041 — tipos do webhook de vendas TMB (Mentoria Freela → Orion).

export type TmbVendaPayload = {
  email?: string | null;
  cliente?: string | null;
  code?: string | null;
  pedido?: number | string | null;
  id?: number | string | null;
  status_pedido?: string | null;
  status_financeiro?: string | null;
  lancamento_id?: number | string | null;
  lancamento?: string | null;
  titulo?: string | null;
};

export type AcaoTmb =
  | {
      acao: "conceder";
      email: string;
      productId: string;
      pedido: string;
      nome?: string;
      lancamentoId?: string;
    }
  | { acao: "revogar"; email: string; productId: string; pedido: string }
  | { acao: "ignorar"; motivo: string };

export const TMB_MENTORIA_CODES_DEFAULT = [
  "1AS249898VN",
  "3XB272209KV",
  "9DW254247E5",
] as const;

export const STATUS_PEDIDO_GRANT = "efetivado";
export const STATUS_FINANCEIRO_GRANT = "adimplente";

export const STATUS_PEDIDO_REVOKE = new Set([
  "cancelado",
  "cancelada",
  "estornado",
  "estornada",
  "reembolsado",
  "reembolsada",
]);

export const STATUS_FINANCEIRO_REVOKE = new Set([
  "inadimplente",
  "inadimplencia",
]);
