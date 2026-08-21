// ADR-013 — init Sentry (Node / Server Actions / RSC).

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
  // F028 / ADR-015 §3 — tracing a 10% em produção (adendo ao ADR-013).
  tracesSampleRate: tracesSampleRate(),
  sendDefaultPii: false,
  beforeSend: beforeSendScrub,
});
