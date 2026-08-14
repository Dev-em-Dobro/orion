import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // Playwright (F008/ADR-006) não pode ser bundlado pelo Next — carrega o
  // Chromium em runtime.
  serverExternalPackages: ["playwright"],

  /**
   * Diretório de build. Padrão `.next`; os scripts de medição (`perf-rotas`,
   * `shot-tema`) passam `NEXT_DIST_DIR=.next-perf`.
   *
   * Por quê: eles rodam `next build` + `next start` de produção, e o dev roda
   * `next dev` — os dois escrevendo no MESMO `.next`. O build de produção
   * apagava e reescrevia os artefatos por baixo do dev server, que passava a
   * responder `Cannot find module './8665.js'` e `Cannot read properties of
   * undefined (reading 'call')` em toda rota. Aconteceu duas vezes em
   * 2026-08-14, e nas duas o diagnóstico inicial foi procurar bug no código —
   * o erro não aponta pra causa.
   *
   * Com diretórios separados, medir não encosta no que você está usando.
   */
  distDir: process.env.NEXT_DIST_DIR || ".next",
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
