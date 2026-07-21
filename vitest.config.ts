import path from "node:path";
import { defineConfig } from "vitest/config";

// ADR-012 — unitários das libs puras (sem Next/jsdom).
export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/unit/**/*.test.ts"],
    isolate: true,
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.d.ts"],
      reporter: ["text", "text-summary"],
    },
  },
});
