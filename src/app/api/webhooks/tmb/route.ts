// F041 — POST /api/webhooks/tmb (TMB vendas → HublaEntitlement).

import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { processarWebhookTmb } from "@/lib/tmb";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenEsperado(): string | null {
  return process.env.TMB_WEBHOOK_TOKEN?.trim() || null;
}

function headerName(): string {
  return process.env.TMB_WEBHOOK_HEADER?.trim() || "x-tmb-token";
}

function tokenValido(recebido: string, esperado: string): boolean {
  const a = Buffer.from(recebido);
  const b = Buffer.from(esperado);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(request: NextRequest) {
  const esperado = tokenEsperado();
  if (!esperado) {
    return NextResponse.json(
      { ok: false, erro: "TMB_WEBHOOK_TOKEN não configurado" },
      { status: 503 },
    );
  }

  const header = headerName();
  const recebido =
    request.headers.get(header) ?? request.headers.get(header.toLowerCase());
  if (!recebido || !tokenValido(recebido, esperado)) {
    return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }

  try {
    const resultado = await processarWebhookTmb(payload);
    return NextResponse.json({
      ok: true,
      ignorado: resultado.ignorado,
      ...(resultado.acao ? { acao: resultado.acao } : {}),
      ...(resultado.motivo ? { motivo: resultado.motivo } : {}),
    });
  } catch (e) {
    console.error("[tmb/webhook] falha ao processar", e);
    return NextResponse.json(
      { ok: false, erro: "Falha interna ao processar evento" },
      { status: 500 },
    );
  }
}
