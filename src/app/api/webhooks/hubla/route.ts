// F019 — POST /api/webhooks/hubla (Hubla → entitlements locais).

import { NextRequest, NextResponse } from "next/server";
import { processarWebhookHubla } from "@/lib/hubla";
import {
  idsOfertaEliteHubla,
  idsOfertaProHubla,
  idsProdutoAcessoHubla,
  idsProdutoClubProAcessoHubla,
  idsProdutoEliteAcessoHubla,
} from "@/lib/hubla/produtos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function tokenEsperado(): string | null {
  return process.env.HUBLA_WEBHOOK_TOKEN?.trim() || null;
}

function idsAcesso(): string[] {
  return idsProdutoAcessoHubla();
}

export async function POST(request: NextRequest) {
  const esperado = tokenEsperado();
  if (!esperado) {
    return NextResponse.json(
      { ok: false, erro: "HUBLA_WEBHOOK_TOKEN não configurado" },
      { status: 503 },
    );
  }

  const productIds = idsAcesso();
  if (productIds.length === 0) {
    return NextResponse.json(
      {
        ok: false,
        erro: "HUBLA_PRODUCT_ID / HUBLA_PRODUCT_ID_ELITE / HUBLA_PRODUCT_ID_CLUB_PRO não configurado",
      },
      { status: 503 },
    );
  }

  const recebido = request.headers.get("x-hubla-token");
  if (!recebido || recebido !== esperado) {
    return NextResponse.json({ ok: false, erro: "Não autorizado" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, erro: "JSON inválido" }, { status: 400 });
  }

  const eventType =
    typeof payload === "object" &&
    payload !== null &&
    "type" in payload &&
    typeof (payload as { type: unknown }).type === "string"
      ? (payload as { type: string }).type
      : "desconhecido";

  const idempotencyKey = request.headers.get("x-hubla-idempotency");

  try {
    const resultado = await processarWebhookHubla(payload, {
      productIdFiltro: {
        productIds,
        offerIdsPro: idsOfertaProHubla(),
        offerIdsElite: idsOfertaEliteHubla(),
        eliteProductIds: idsProdutoEliteAcessoHubla(),
        clubProProductIds: idsProdutoClubProAcessoHubla(),
      },
      idempotencyKey,
      eventType,
    });

    return NextResponse.json({
      ok: true,
      ignorado: resultado.ignorado,
      ...(resultado.motivo ? { motivo: resultado.motivo } : {}),
    });
  } catch (e) {
    console.error("[hubla/webhook] falha ao processar", e);
    return NextResponse.json(
      { ok: false, erro: "Falha interna ao processar evento" },
      { status: 500 },
    );
  }
}
