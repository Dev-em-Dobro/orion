// ADR-013 — init Sentry (Edge / middleware).

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
