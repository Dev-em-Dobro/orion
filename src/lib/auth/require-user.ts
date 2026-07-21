// F014 — ponto único de checagem de sessão (consumido pela F015).
// Spec: /specs/02-features/F014-autenticacao.md (AC4)

import { headers } from "next/headers";
import { auth, type AuthUser } from "./index";
import { AuthError } from "./errors";
import { setSentryUser } from "@/lib/observabilidade";

/**
 * Devolve o usuário da sessão atual ou lança `AuthError`.
 * Use em toda Server Action que precise de identidade (F015 escopa por user_id).
 */
export async function requireUser(): Promise<AuthUser> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    setSentryUser(null);
    throw new AuthError("Sessão necessária. Faça login para continuar.");
  }

  setSentryUser(session.user.id);
  return session.user;
}
