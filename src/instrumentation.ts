// Boot: secrets críticos + Sentry (ADR-013).

import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }

  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  if (process.env.NEXT_PHASE === "phase-production-build") return;

  const { assertCriticalSecrets } = await import(
    "@/lib/seguranca/env-servidor"
  );
  assertCriticalSecrets();
}

export const onRequestError = Sentry.captureRequestError;
