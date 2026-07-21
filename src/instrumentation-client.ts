// ADR-013 — init Sentry no browser (Next 15 instrumentation-client).

import * as Sentry from "@sentry/nextjs";
import {
  beforeSendScrub,
  sentryDsn,
  sentryEnabled,
  SENTRY_ENV,
} from "./lib/observabilidade/opcoes";

Sentry.init({
  dsn: sentryDsn(),
  enabled: sentryEnabled(),
  environment: SENTRY_ENV,
  sendDefaultPii: false,
  beforeSend: beforeSendScrub,
});

// Exigido pelo SDK (@sentry/nextjs) mesmo com tracing desligado no beta.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
