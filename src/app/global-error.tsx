"use client";

// ADR-013 — root error boundary (obrigatório pro App Router + Sentry).

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="pt-BR">
      <body className="bg-zinc-950 px-6 py-16 text-zinc-100">
        <main className="mx-auto max-w-lg">
          <h1 className="text-xl font-semibold">Erro inesperado</h1>
          <p className="mt-2 text-sm text-zinc-400">
            Registramos o problema. Recarregue a página ou tente mais tarde.
          </p>
          <button
            type="button"
            className="mt-6 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium"
            onClick={reset}
          >
            Tentar novamente
          </button>
        </main>
      </body>
    </html>
  );
}
