import type { ReactNode } from "react";
import Link from "next/link";
import { ATUALIZADO_EM, OPERADOR_LEGAL } from "@/lib/legal";

export function PaginaLegal({
  titulo,
  children,
}: {
  titulo: string;
  children: ReactNode;
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-12">
      <p className="text-sm text-zinc-500">
        <Link href="/login" className="hover:text-zinc-300">
          ← {OPERADOR_LEGAL.produto}
        </Link>
      </p>
      <h1 className="mt-6 text-3xl font-bold tracking-tight">{titulo}</h1>
      <p className="mt-2 text-sm text-zinc-500">
        Última atualização: {ATUALIZADO_EM}
      </p>
      <div className="prose-legal mt-10 space-y-6 text-sm leading-relaxed text-zinc-300">
        {children}
      </div>
      <p className="mt-12 border-t border-border pt-6 text-xs text-zinc-600">
        Operador: {OPERADOR_LEGAL.nome} ·{" "}
        <a
          href={`mailto:${OPERADOR_LEGAL.emailPrivacidade}`}
          className="text-primary hover:underline"
        >
          {OPERADOR_LEGAL.emailPrivacidade}
        </a>
      </p>
    </main>
  );
}
