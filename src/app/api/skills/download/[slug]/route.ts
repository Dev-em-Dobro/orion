// F030 — .zip de uma Skill, montado sob demanda a partir de content/skills/.
// Spec: /specs/02-features/F030-menu-skills.md
//
// Mesma auth + compra verificada da API de entregáveis: conteúdo servido
// internamente, sem URL pública.

import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { AuthError } from "@/lib/auth/errors";
import { usuarioTemCompraVerificada } from "@/lib/compra";
import { montarZipDaSkill } from "@/lib/skills/servir";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const user = await requireUser();
    if (!(await usuarioTemCompraVerificada(user.id))) {
      return NextResponse.json({ erro: "Compra pendente" }, { status: 403 });
    }
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ erro: "Sessão necessária" }, { status: 401 });
    }
    throw e;
  }

  const { slug } = await params;
  // `skillPorSlug` (dentro de montarZipDaSkill) rejeita slug fora do catálogo,
  // então `..` ou barra nunca chegam ao filesystem.
  const zip = await montarZipDaSkill(slug);
  if (!zip) {
    return NextResponse.json({ erro: "Skill não encontrada" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(zip.body), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zip.nomeArquivo}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
