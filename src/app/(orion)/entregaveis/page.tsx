// F020 — visão geral dos entregáveis.

import Link from "next/link";
import { ENTREGAVEIS } from "@/lib/entregaveis";

export const dynamic = "force-dynamic";

function IconeDownload() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-3.5 w-3.5 shrink-0"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M7 10l5 5 5-5" />
      <path d="M12 15V3" />
    </svg>
  );
}

export default function EntregaveisPage() {
  const disponiveis = ENTREGAVEIS.filter((e) => !e.emBreve);
  const emBreve = ENTREGAVEIS.filter((e) => e.emBreve);

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <h1 className="text-2xl font-bold tracking-tight">Materiais</h1>
      <p className="mt-1 text-sm text-muted">
        Tudo o que você recebe na Consultoria Freela, num lugar só.
      </p>

      <section className="mt-6 space-y-3 sm:mt-8">
        <h2 className="text-sm font-semibold text-zinc-300">Disponível agora</h2>
        <ul className="space-y-3">
          {disponiveis.map((item) => (
            <li key={item.slug} className="card space-y-3">
              <div>
                <p className="font-medium text-zinc-100">{item.titulo}</p>
                <p className="mt-1 text-sm text-muted">{item.descricao}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/entregaveis/${item.slug}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Abrir →
                </Link>
                {item.kitZip ? (
                  <a
                    href={`/api/entregaveis/download/${item.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-md border border-zinc-700 bg-zinc-900/80 px-2.5 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800 hover:text-white"
                    download={item.kitZip.nomeArquivo}
                  >
                    <IconeDownload />
                    Baixar .zip
                  </a>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>

      {emBreve.length > 0 && (
        <section className="mt-10 space-y-3">
          <h2 className="text-sm font-semibold text-zinc-500">Em breve</h2>
          <ul className="space-y-3">
            {emBreve.map((item) => (
              <li
                key={item.slug}
                className="card border-zinc-800/60 opacity-60"
              >
                <p className="font-medium text-zinc-400">{item.titulo}</p>
                <p className="mt-1 text-sm text-zinc-500">{item.descricao}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
