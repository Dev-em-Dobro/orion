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
