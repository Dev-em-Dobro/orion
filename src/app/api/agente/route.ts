// F029 — endpoint do Agente Orion.
// Spec: /specs/02-features/F029-agente-orion.md
//
// Node runtime (precisa do Prisma nas ferramentas). Streaming: a resposta
// começa a aparecer enquanto o loop de ferramentas ainda roda.

import { z } from "zod";
import { NextResponse } from "next/server";
import { requireTenant } from "@/lib/db/scoped";
import { AuthError } from "@/lib/auth/errors";
import { consumirCota, verificarCota } from "@/lib/limites";
import { QuotaExcedidaError } from "@/lib/limites/erros";
import { LlmError } from "@/lib/llm";
import { ChaveAusenteError, ChaveOperacaoError } from "@/lib/chaves/erros";
import { ChaveOrionIndisponivelError } from "@/lib/chaves/orion";
import { responderAgente } from "@/lib/agente/executar";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Teto de histórico: conversa longa vira custo, e o agente relê tudo. */
const MAX_MENSAGENS = 20;
const MAX_CHARS = 4000;

const schema = z.object({
  mensagens: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(MAX_CHARS),
      }),
    )
    .min(1)
    .max(MAX_MENSAGENS),
});

export async function POST(req: Request) {
  let userId: string;
  try {
    ({ userId } = await requireTenant());
  } catch (e) {
    if (e instanceof AuthError) {
      return NextResponse.json({ erro: "Sessão necessária" }, { status: 401 });
    }
    throw e;
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ erro: "Mensagem inválida" }, { status: 400 });
  }

  try {
    // Cota antes de qualquer chamada ao provider (F018).
    await verificarCota(userId, "agente_msg");

    const resultado = await responderAgente({
      userId,
      mensagens: parsed.data.mensagens,
    });

    // Consome ao concluir, não ao pedir: pergunta que falhou não gasta cota.
    void resultado.text.then(
      () => consumirCota(userId, "agente_msg"),
      () => undefined,
    );

    return resultado.toTextStreamResponse();
  } catch (e) {
    if (
      e instanceof QuotaExcedidaError ||
      e instanceof ChaveAusenteError ||
      e instanceof ChaveOrionIndisponivelError ||
      e instanceof ChaveOperacaoError ||
      e instanceof LlmError
    ) {
      return NextResponse.json({ erro: e.message }, { status: 429 });
    }
    throw e;
  }
}
