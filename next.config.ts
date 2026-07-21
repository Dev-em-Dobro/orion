import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // Playwright (F008/ADR-006) não pode ser bundlado pelo Next — carrega o
  // Chromium em runtime.
  serverExternalPackages: ["playwright"],
};

const temAuthToken = Boolean(process.env.SENTRY_AUTH_TOKEN?.trim());

// ADR-013 — wrap Sentry. Sem SENTRY_AUTH_TOKEN ⇒ sem upload de source maps
// (`dryRun` foi removido do SentryBuildOptions; usar `sourcemaps.disable`).
export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
  sourcemaps: {
    disable: !temAuthToken,
  },
  release: {
    create: temAuthToken,
  },
  widenClientFileUpload: true,
  webpack: {
    treeshake: {
      removeDebugLogging: true,
    },
    automaticVercelMonitors: false,
  },
});
