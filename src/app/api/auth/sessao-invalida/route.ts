// F014 AC10 — saída para cookie de sessão que não vale mais.
//
// O middleware é otimista (só olha se o cookie existe) e `requireUser()` é que
// valida de verdade. Quando o cookie sobrevive à sessão — banco recriado,
// sessão revogada, `BETTER_AUTH_SECRET` trocado — alguém precisa **apagar o
// cookie** antes de mandar pro login. Sem isso vira loop: o middleware vê
// cookie em `/login` e devolve pra `/`, que lança de novo.
//
// Precisa ser route handler: página e layout do App Router não escrevem cookie.

import { NextResponse } from "next/server";

/**
 * Nomes que o Better Auth usa. `session_data` é o cookie cache (F028); o
 * prefixo `__Secure-` aparece quando a origem é HTTPS. Apagar todos é barato e
 * evita depender de detectar o ambiente aqui.
 */
const COOKIES_SESSAO = [
  "better-auth.session_token",
  "better-auth.session_data",
  "__Secure-better-auth.session_token",
  "__Secure-better-auth.session_data",
];

export async function GET(request: Request) {
  const destino = new URL("/login?error=sessao_expirada", request.url);
  const resposta = NextResponse.redirect(destino);

  for (const nome of COOKIES_SESSAO) {
    // `set` com maxAge 0 em vez de `delete`: o cookie foi gravado com `path=/`
    // e precisa ser apagado com o mesmo path, senão o navegador mantém o
    // original e o loop volta.
    resposta.cookies.set(nome, "", { path: "/", maxAge: 0 });
  }

  return resposta;
}
