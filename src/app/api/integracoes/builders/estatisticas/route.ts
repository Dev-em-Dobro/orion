// F044 — POST /api/integracoes/builders/estatisticas (somente leitura, só contagens).
// Spec: /specs/02-features/F044-estatisticas-builders.md

import { NextRequest, NextResponse } from "next/server";
import { autorizado, corpoSchema } from "@/lib/integracoes/builders-estatisticas";
import { buscarEstatisticas } from "@/lib/integracoes/builders-repositorio";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SEM_CACHE = { "Cache-Control": "no-store" };

export async function POST(request: NextRequest) {
  const segredo = process.env.BUILDERS_INTEGRATION_SECRET?.trim();
  if (!segredo) {
    return NextResponse.json({ erro: "Integração não configurada" }, { status: 503, headers: SEM_CACHE });
  }
  if (!autorizado(request.headers.get("authorization"), segredo)) {
    return NextResponse.json({ erro: "Não autorizado" }, { status: 401, headers: SEM_CACHE });
  }

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ erro: "JSON inválido" }, { status: 400, headers: SEM_CACHE });
  }
  const entrada = corpoSchema.safeParse(corpo);
  if (!entrada.success) {
    return NextResponse.json(
      { erro: "Corpo inválido", detalhes: entrada.error.issues.map((issue) => issue.message) },
      { status: 400, headers: SEM_CACHE },
    );
  }

  try {
    const resultados = await buscarEstatisticas(entrada.data);
    return NextResponse.json({ resultados }, { headers: SEM_CACHE });
  } catch (e) {
    console.error("[integracoes/builders] falha ao consultar", e);
    return NextResponse.json({ erro: "Falha interna" }, { status: 500, headers: SEM_CACHE });
  }
}
