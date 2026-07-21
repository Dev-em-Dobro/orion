// F014 — proteção de rotas (AC1). Cookie check otimista; requireUser() valida de fato.
// Spec: /specs/02-features/F014-autenticacao.md

import { NextRequest, NextResponse } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

function isProtectedPath(pathname: string): boolean {
  if (pathname === "/") return true;
  return (
    pathname.startsWith("/leads") ||
    pathname.startsWith("/treino") ||
    pathname.startsWith("/configuracao")
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
    const callback =
      pathname + (request.nextUrl.search ? request.nextUrl.search : "");
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
    "/treino/:path*",
    "/configuracao/:path*",
    "/login",
  ],
};
