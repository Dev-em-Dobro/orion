import {
  STATUS_FINANCEIRO_GRANT,
  STATUS_FINANCEIRO_REVOKE,
  STATUS_PEDIDO_GRANT,
  STATUS_PEDIDO_REVOKE,
  TMB_MENTORIA_CODES_DEFAULT,
  type AcaoTmb,
  type TmbVendaPayload,
} from "./tipos";

function asRecord(payload: unknown): Record<string, unknown> | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return null;
  }
  return payload as Record<string, unknown>;
}

export function extrairVenda(payload: unknown): TmbVendaPayload | null {
  const root = asRecord(payload);
  if (!root) return null;

  if (typeof root.email === "string" || typeof root.code === "string") {
    return root as TmbVendaPayload;
  }

  for (const key of ["data", "venda", "pedido", "event"] as const) {
    const nested = asRecord(root[key]);
    if (
      nested &&
      (typeof nested.email === "string" || typeof nested.code === "string")
    ) {
      return nested as TmbVendaPayload;
    }
  }

  return root as TmbVendaPayload;
}

export function codesPermitidos(): Set<string> {
  const raw = process.env.TMB_PRODUCT_CODES?.trim();
  const list = raw
    ? raw.split(",").map((c) => c.trim()).filter(Boolean)
    : [...TMB_MENTORIA_CODES_DEFAULT];
  return new Set(list.map((c) => c.toUpperCase()));
}

/** IDs de produto que liberam compra Orion (Hubla Builders + TMB Mentoria). */
export function productIdsAcessoCompra(): string[] {
  const ids = new Set<string>();
  const hubla = process.env.HUBLA_PRODUCT_ID?.trim();
  if (hubla) ids.add(hubla);
  for (const code of codesPermitidos()) {
    ids.add(code);
  }
  return [...ids];
}

export function lancamentoIdFiltro(): string | null {
  return process.env.TMB_LANCAMENTO_ID?.trim() || null;
}

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

function emailValido(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function interpretarVendaTmb(payload: unknown): AcaoTmb {
  const venda = extrairVenda(payload);
  if (!venda) {
    return { acao: "ignorar", motivo: "payload inválido" };
  }

  const email = (venda.email ?? "").trim().toLowerCase();
  if (!email || !emailValido(email)) {
    return { acao: "ignorar", motivo: "email inválido ou ausente" };
  }

  const productId = (venda.code ?? "").trim();
  if (!productId) {
    return { acao: "ignorar", motivo: "code ausente" };
  }

  if (!codesPermitidos().has(productId.toUpperCase())) {
    return { acao: "ignorar", motivo: "code fora das ofertas Mentoria" };
  }

  const lancamentoFiltro = lancamentoIdFiltro();
  if (lancamentoFiltro) {
    const lid = String(venda.lancamento_id ?? "").trim();
    if (lid && lid !== lancamentoFiltro) {
      return { acao: "ignorar", motivo: "lancamento_id não filtrado" };
    }
  }

  const pedido = String(venda.pedido ?? venda.id ?? "").trim();
  if (!pedido) {
    return { acao: "ignorar", motivo: "pedido ausente" };
  }

  const statusPedido = norm(venda.status_pedido);
  const statusFin = norm(venda.status_financeiro);
  const nome = (venda.cliente ?? "").trim() || undefined;
  const lancamentoId =
    venda.lancamento_id != null ? String(venda.lancamento_id) : undefined;

  if (
    STATUS_PEDIDO_REVOKE.has(statusPedido) ||
    STATUS_FINANCEIRO_REVOKE.has(statusFin)
  ) {
    return { acao: "revogar", email, productId, pedido };
  }

  if (
    statusPedido === STATUS_PEDIDO_GRANT &&
    statusFin === STATUS_FINANCEIRO_GRANT
  ) {
    return {
      acao: "conceder",
      email,
      productId,
      pedido,
      nome,
      lancamentoId,
    };
  }

  return {
    acao: "ignorar",
    motivo: `status não liberam acesso (${venda.status_pedido}/${venda.status_financeiro})`,
  };
}

export function idempotencyKeyTmb(acao: AcaoTmb, payload: unknown): string {
  const venda = extrairVenda(payload);
  const pedido =
    acao.acao === "ignorar"
      ? String(venda?.pedido ?? venda?.id ?? "unknown")
      : acao.pedido;
  const sp = norm(venda?.status_pedido) || "na";
  const sf = norm(venda?.status_financeiro) || "na";
  return `tmb:${pedido}:${sp}:${sf}`;
}
