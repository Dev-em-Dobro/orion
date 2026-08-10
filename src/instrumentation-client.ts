// ADR-013 — init Sentry no browser (Next 15 instrumentation-client).

import * as Sentry from "@sentry/nextjs";
import {
  beforeSendScrub,
  sentryDsn,
  sentryEnabled,
  tracesSampleRate,
  SENTRY_ENV,
} from "./lib/observabilidade/opcoes";

Sentry.init({
  dsn: sentryDsn(),
  enabled: sentryEnabled(),
  environment: SENTRY_ENV,
  // F028 / ADR-015 §3 — TTFB/LCP reais das rotas principais.
  tracesSampleRate: tracesSampleRate(),
  sendDefaultPii: false,
  beforeSend: beforeSendScrub,
});

// Exigido pelo SDK (@sentry/nextjs).
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
