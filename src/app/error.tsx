"use client";

// ADR-013 — erro de segmento (App Router). Reporta ao Sentry.

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

export default function Error({
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
    <main className="mx-auto flex min-h-[50vh] max-w-lg flex-col justify-center px-6 py-16">
      <h1 className="text-xl font-semibold tracking-tight">
        Algo deu errado
      </h1>
      <p className="mt-2 text-sm text-zinc-400">
        O erro foi registrado. Tente de novo; se persistir, avise o suporte.
      </p>
      {error.digest ? (
        <p className="mt-3 font-mono text-xs text-zinc-600">
          ref: {error.digest}
        </p>
      ) : null}
      <button type="button" className="btn mt-6 w-fit" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
