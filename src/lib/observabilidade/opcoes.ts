// ADR-013 — opções comuns do Sentry (tipo frouxo pra não arrastar o SDK nos unit).

type ScrubEvent = {
  request?: {
    cookies?: unknown;
    headers?: Record<string, string>;
  };
};

export function sentryDsn(): string | undefined {
  const dsn =
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
  return dsn || undefined;
}

export function sentryEnabled(): boolean {
  return Boolean(sentryDsn());
}

/** Remove cookies / Authorization — nunca BYOK / sessão. */
export function beforeSendScrub<T extends ScrubEvent>(event: T): T | null {
  if (event.request) {
    delete event.request.cookies;
    if (event.request.headers) {
      const h = { ...event.request.headers };
      for (const key of Object.keys(h)) {
        const lower = key.toLowerCase();
        if (
          lower === "cookie" ||
          lower === "authorization" ||
          lower.includes("api-key") ||
          lower.includes("x-api-key")
        ) {
          delete h[key];
        }
      }
      event.request.headers = h;
    }
  }
  return event;
}

export const SENTRY_ENV =
  process.env.SENTRY_ENVIRONMENT?.trim() ||
  process.env.VERCEL_ENV?.trim() ||
  process.env.NODE_ENV ||
  "development";

/**
 * F028 / ADR-015 §3 — adendo ao ADR-013, que fixou o tracing em 0 ("só erros
 * no beta"). Sem tracing não há como verificar os ACs numéricos de desempenho.
 * Produção passa a 0.1 (10% das requisições); dev fica em 0 pra não poluir.
 * Override por `SENTRY_TRACES_SAMPLE_RATE` (0..1).
 *
 * O scrub de cookies/Authorization/chaves (`beforeSendScrub`) continua valendo
 * integralmente — a restrição do ADR-013 sobre BYOK e magic link não muda.
 */
export function tracesSampleRate(): number {
  const bruto = process.env.SENTRY_TRACES_SAMPLE_RATE?.trim();
  if (bruto) {
    const n = Number(bruto);
    if (Number.isFinite(n) && n >= 0 && n <= 1) return n;
  }
  return SENTRY_ENV === "production" ? 0.1 : 0;
}
