// F014 — ponto único de checagem de sessão (consumido pela F015).
// Spec: /specs/02-features/F014-autenticacao.md (AC4)

import { cache } from "react";
import { headers } from "next/headers";
import { auth, type AuthUser } from "./index";
import { AuthError } from "./errors";
import { setSentryUser } from "@/lib/observabilidade";

/**
 * Devolve o usuário da sessão atual ou lança `AuthError`.
 * Use em toda Server Action que precise de identidade (F015 escopa por user_id).
 *
 * F028 (H5) — memoizado por request com `cache()` do React: numa página o
 * layout, a sidebar, os banners e o próprio componente chamam isto várias
 * vezes, e cada chamada era uma consulta de sessão. Agora é uma só. Junto com
 * o cookie cache do Better Auth (`src/lib/auth/index.ts`), o caso comum não
 * toca o banco.
 */
export const requireUser = cache(async function requireUser(): Promise<AuthUser> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    setSentryUser(null);
    throw new AuthError("Sessão necessária. Faça login para continuar.");
  }

  setSentryUser(session.user.id);
  return session.user;
});
