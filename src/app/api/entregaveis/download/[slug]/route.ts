// F020 — download de kit .zip (portfolio, contrato, scripts).

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireCompraAtiva } from "@/lib/compra/servico";
import { montarKitZipPorSlug } from "@/lib/entregaveis/kit-zip";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ slug: string }> };

async function sessaoAtiva(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

export async function GET(_request: NextRequest, { params }: Params) {
  const userId = await sessaoAtiva();
  if (!userId) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });
  }

  try {
    await requireCompraAtiva(userId);
  } catch {
    return NextResponse.json({ erro: "Compra não verificada" }, { status: 403 });
  }

  const { slug } = await params;
  const kit = await montarKitZipPorSlug(slug);
  if (!kit) {
    return NextResponse.json({ erro: "Kit não encontrado" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(kit.body), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${kit.nomeArquivo}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
