// F033 — municípios de uma UF, para o select encadeado da busca.
// Spec: /specs/02-features/F033-busca-estruturada.md
//
// Existe pra que o JSON de 5.571 municípios NÃO vá pro bundle do cliente
// (AC8): a página carrega só a UF que o aluno escolheu.

import { NextResponse } from "next/server";
import { municipiosDaUf, ufValida } from "@/lib/localidades";
import { requireUser } from "@/lib/auth/require-user";
import { AuthError } from "@/lib/auth/errors";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ uf: string }> },
) {
  try {
    // Dado público, mas a rota é do app logado — sem endpoint aberto de graça.
    await requireUser();
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ erro: "Sessão necessária" }, { status: 401 });
    }
    throw e;
  }

  const { uf } = await params;
  const sigla = ufValida(uf);
  if (!sigla) {
    return NextResponse.json({ erro: "UF inválida" }, { status: 400 });
  }

  return NextResponse.json(
    { uf: sigla, municipios: municipiosDaUf(sigla) },
    {
      // Base estática: pode ficar em cache no navegador por bastante tempo.
      headers: { "Cache-Control": "private, max-age=86400" },
    },
  );
}
