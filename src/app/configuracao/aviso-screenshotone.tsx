// Aviso: em Vercel/serverless o F008 exige ScreenshotOne (ADR-006).

import type { VisaoChave } from "@/lib/chaves";

type Props = {
  screenshot: VisaoChave | undefined;
  /** true em Vercel / quando Playwright não roda. */
  obrigatorioEmProd: boolean;
};

export function AvisoScreenshotOne({
  screenshot,
  obrigatorioEmProd,
}: Props) {
  if (!obrigatorioEmProd) return null;

  const ok = screenshot?.status === "configurada";
  if (ok) {
    return (
      <p className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-4 py-3 text-xs text-emerald-200/90">
        ScreenshotOne configurada — Diagnóstico UX (F008) usa a API externa
        neste ambiente serverless (Playwright não roda na Vercel).
      </p>
    );
  }

  return (
    <section className="rounded-xl border border-sky-500/30 bg-sky-500/10 p-5">
      <h2 className="text-sm font-semibold text-sky-100">
        Produção: ScreenshotOne para Diagnóstico UX
      </h2>
      <p className="mt-1 text-sm text-sky-100/85">
        Neste ambiente (Vercel) o Chromium do Playwright{" "}
        <strong className="font-medium text-sky-50">não roda</strong>. Sem a
        chave ScreenshotOne no slot abaixo, o Diagnóstico UX falha. Em
        desenvolvimento local o Playwright segue como fallback.
      </p>
      <p className="mt-2 text-xs text-sky-200/70">
        Conta em{" "}
        <a
          href="https://screenshotone.com"
          target="_blank"
          rel="noreferrer"
          className="underline underline-offset-2 hover:text-sky-50"
        >
          screenshotone.com
        </a>{" "}
        → cole o access key em Configuração.
      </p>
    </section>
  );
}
