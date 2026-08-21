// F020 — serve entregáveis só para compra verificada (sem URL pública externa).

import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { requireCompraAtiva } from "@/lib/compra/servico";
import { lerArquivoEntregavel, sanitizarCorpoEntregavel } from "@/lib/entregaveis/servir";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Params = { params: Promise<{ path: string[] }> };

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

  const { path } = await params;
  const arquivo = await lerArquivoEntregavel(path);
  if (!arquivo) {
    return NextResponse.json({ erro: "Não encontrado" }, { status: 404 });
  }

  const corpo = sanitizarCorpoEntregavel(arquivo.body, arquivo.contentType);

  return new NextResponse(new Uint8Array(corpo), {
    status: 200,
    headers: {
      "Content-Type": arquivo.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      ...(arquivo.contentType.startsWith("text/html")
        ? {
            "Content-Security-Policy":
              "default-src 'self' 'unsafe-inline' data: blob:; connect-src 'none'; form-action 'none'; frame-ancestors 'self'; base-uri 'none'",
          }
        : {}),
    },
  });
}
