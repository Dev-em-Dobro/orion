// Só ativo com E2E_SESSION_HELPER=1 — emite cookie de sessão com o mesmo
// formato do Better Auth (HMAC-SHA256 + base64 com padding).
// Bloqueado em produção / Preview Vercel mesmo se a env vazar.

import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/db";
import { auth } from "@/lib/auth";

function helperPermitido(): boolean {
  if (process.env.E2E_SESSION_HELPER !== "1") return false;
  if (process.env.NODE_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "production") return false;
  if (process.env.VERCEL_ENV === "preview") return false;
  return true;
}

async function signCookieValue(value: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sigBuf = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );
  const signature = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));
  return `${value}.${signature}`;
}

export async function POST(req: NextRequest) {
  if (!helperPermitido()) {
    return NextResponse.json({ error: "disabled" }, { status: 404 });
  }

  const esperado = process.env.E2E_SESSION_SECRET?.trim();
  if (esperado) {
    const recebido = req.headers.get("x-e2e-secret");
    if (!recebido || recebido !== esperado) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }
  }

  const body = (await req.json()) as { userId?: string };
  if (!body.userId) {
    return NextResponse.json({ error: "userId obrigatório" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: body.userId } });
  if (!user) {
    return NextResponse.json({ error: "User não encontrado" }, { status: 404 });
  }

  const token = randomBytes(32).toString("hex");
  await prisma.session.create({
    data: {
      id: randomBytes(16).toString("hex"),
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  });

  const ctx = await auth.$context;
  const cookieName = ctx.authCookies.sessionToken.name;
  const signed = await signCookieValue(token, ctx.secret);

  const res = NextResponse.json({ ok: true, userId: user.id });
  res.cookies.set(cookieName, signed, {
    httpOnly: true,
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}
