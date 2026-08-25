import {
  STATUS_FINANCEIRO_GRANT,
  STATUS_FINANCEIRO_REVOKE,
  STATUS_PEDIDO_GRANT,
  STATUS_PEDIDO_REVOKE,
  TMB_CODE_MENTORIA_PRO,
  TMB_ELITE_CODES_DEFAULT,
  type AcaoTmb,
  type TmbVendaPayload,
} from "./tipos";
import {
  idsChaveAcessoHubla,
  idsProdutoEliteAcessoHubla,
} from "@/lib/hubla/produtos";

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

/** Codes TMB Elite (boleto). Mentoria fica de fora mesmo se vier no override. */
export function codesPermitidos(): Set<string> {
  const raw =
    process.env.TMB_ELITE_CODES?.trim() ||
    process.env.TMB_PRODUCT_CODES?.trim();
  const list = raw
    ? raw.split(",").map((c) => c.trim()).filter(Boolean)
    : [...TMB_ELITE_CODES_DEFAULT];
  const mentoria = TMB_CODE_MENTORIA_PRO.toUpperCase();
  return new Set(
    list.map((c) => c.toUpperCase()).filter((c) => c !== mentoria),
  );
}

/** Porta Orion: Elite TMB + Mentoria PRO (acesso Free). */
export function codesAcessoOrion(): Set<string> {
  const set = codesPermitidos();
  set.add(TMB_CODE_MENTORIA_PRO.toUpperCase());
  return set;
}

/** IDs que liberam compra Orion: Hubla (Elite + PRO Club) + TMB (Elite + Mentoria). */
export function productIdsAcessoCompra(): string[] {
  const ids = new Set<string>([
    ...idsChaveAcessoHubla(),
  ]);
  for (const code of codesAcessoOrion()) {
    ids.add(code);
  }
  return [...ids];
}

/** Só Elite (Hubla + boleto TMB) — cortesia Pro. */
export function productIdsCortesiaPro(): string[] {
  const ids = new Set<string>(idsProdutoEliteAcessoHubla());
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

  if (!codesAcessoOrion().has(productId.toUpperCase())) {
    return { acao: "ignorar", motivo: "code fora das ofertas de acesso" };
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
