// F014 — proteção de rotas (AC1). Cookie check otimista; requireUser() valida de fato.
// Spec: /specs/02-features/F014-autenticacao.md

import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";
import { sanitizarCallbackUrl } from "@/lib/auth/callback-url";
import { PLANOS_NA_UI } from "@/lib/planos/exibicao";

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return (
    pathname.startsWith("/leads") ||
    pathname.startsWith("/tarefas") ||
    pathname.startsWith("/funil") ||
    pathname.startsWith("/agente") ||
    pathname.startsWith("/treino") ||
    pathname.startsWith("/configuracao") ||
    pathname.startsWith("/conteudo") ||
    pathname.startsWith("/entregaveis") ||
    pathname.startsWith("/skills") ||
    // Pausa de 2026-08-17 (F035): fora do ar, `/planos` não é rota protegida —
    // é rota que não existe. Protegida, ela mandaria o visitante pro login pra
    // devolver um 404 depois de logar. O `matcher` abaixo continua listando a
    // rota porque precisa ser estático; quem decide é esta função.
    (PLANOS_NA_UI && pathname.startsWith("/planos")) ||
    pathname.startsWith("/ativar-acesso")
  );
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionCookie = getSessionCookie(request);

  if (pathname === "/login") {
    if (sessionCookie) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    return NextResponse.next();
  }

  if (isProtectedPath(pathname) && !sessionCookie) {
    const loginUrl = new URL("/login", request.url);
    const callback = sanitizarCallbackUrl(
      pathname + (request.nextUrl.search ? request.nextUrl.search : ""),
    );
    if (callback !== "/") {
      loginUrl.searchParams.set("callbackUrl", callback);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/leads/:path*",
    "/tarefas/:path*",
    "/funil/:path*",
    "/agente/:path*",
    "/treino/:path*",
    "/configuracao/:path*",
    "/conteudo/:path*",
    "/entregaveis/:path*",
    "/skills/:path*",
    "/planos",
    "/ativar-acesso",
    "/login",
  ],
};
