import path from "node:path";
import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname),
  // Playwright (F008/ADR-006) não pode ser bundlado pelo Next — carrega o
  // Chromium em runtime.
  serverExternalPackages: ["playwright"],

  /**
   * Diretório de build, separado por modo: `next dev` escreve em `.next-dev`,
   * build e `next start` em `.next`. `NEXT_DIST_DIR` sobrepõe (os scripts de
   * medição passam `.next-perf`).
   *
   * Por quê: build de produção e dev server escreviam no MESMO `.next`. O
   * build apagava e reescrevia os artefatos por baixo do dev, que passava a
   * responder `Cannot find module './8665.js'` em toda rota — ou, quando o
   * build terminava inteiro, a servir chunks de produção para um HTML de dev:
   * `main-app.js` 404, nenhuma tela hidrata, nenhum botão funciona e **nada
   * no console aponta pra causa**. Aconteceu três vezes em 2026-08-14.
   *
   * A separação era opt-in por env var — quer dizer, valia até alguém rodar
   * `npm run build` sem lembrar dela, que foi exatamente o que aconteceu.
   * Agora é o modo que decide, e esquecer não é mais uma opção.
   */
  distDir:
    process.env.NEXT_DIST_DIR ||
    (process.env.NODE_ENV === "development" ? ".next-dev" : ".next"),
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
