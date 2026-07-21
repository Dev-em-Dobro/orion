// ADR-013 — init Sentry (Node / Server Actions / RSC).

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
  // Sem tracesSampleRate — beta só erros (ADR-013).
  sendDefaultPii: false,
  beforeSend: beforeSendScrub,
});
