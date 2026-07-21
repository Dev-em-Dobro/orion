// ADR-013 — helper pra Server Actions / libs. No-op sem DSN.

import * as Sentry from "@sentry/nextjs";
import { sentryEnabled } from "./opcoes";

/** Reporta exceção sem relançar. Não passar secrets no `contexto`. */
export function reportarErro(
  erro: unknown,
  contexto?: Record<string, string | number | boolean>,
): void {
  if (!sentryEnabled()) return;
  Sentry.withScope((scope) => {
    if (contexto) {
      for (const [k, v] of Object.entries(contexto)) {
        scope.setExtra(k, v);
      }
    }
    Sentry.captureException(erro);
  });
}

/** Associa o usuário autenticado (só id — sem e-mail). */
export function setSentryUser(userId: string | null): void {
  if (!sentryEnabled()) return;
  if (!userId) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: userId });
}
