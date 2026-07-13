"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Icone({ d }: { d: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 shrink-0"
    >
      {d}
    </svg>
  );
}

const GRUPOS = [
  {
    titulo: "Prospecção",
    itens: [
      {
        href: "/",
        label: "Dashboard",
        icone: (
          <Icone
            d={
              <>
                <rect x="3" y="3" width="7" height="9" rx="1" />
                <rect x="14" y="3" width="7" height="5" rx="1" />
                <rect x="14" y="12" width="7" height="9" rx="1" />
                <rect x="3" y="16" width="7" height="5" rx="1" />
              </>
            }
          />
        ),
      },
      {
        href: "/leads",
        label: "Leads",
        icone: (
          <Icone
            d={
              <>
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </>
            }
          />
        ),
      },
    ],
  },
  {
    titulo: "Conteúdo",
    itens: [
      {
        href: "/conteudo",
        label: "Vídeo-Funil",
        icone: (
          <Icone
            d={
              <>
                <path d="m22 8-6 4 6 4V8Z" />
                <rect x="2" y="6" width="14" height="12" rx="2" />
              </>
            }
          />
        ),
      },
    ],
  },
  {
    titulo: "Treino",
    itens: [
      {
        href: "/treino",
        label: "Simulador de venda",
        icone: (
          <Icone
            d={
              <>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </>
            }
          />
        ),
      },
    ],
  },
];

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 font-semibold tracking-tight transition-colors hover:text-primary"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-5 w-5 text-primary"
      >
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="6" />
        <circle cx="12" cy="12" r="2" />
      </svg>
      <span className="text-primary">Orion</span>
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();

  const ativo = (href: string) =>
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <>
      {/* Sidebar fixa (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card/40 md:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Brand />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          {GRUPOS.map((grupo) => (
            <div key={grupo.titulo}>
              <p className="px-2 text-xs font-medium tracking-wider text-zinc-500 uppercase">
                {grupo.titulo}
              </p>
              <ul className="mt-2 space-y-1">
                {grupo.itens.map((item) => (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200 ${
                        ativo(item.href)
                          ? "bg-zinc-800/80 font-medium text-zinc-50"
                          : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
                      }`}
                    >
                      <span
                        className={
                          ativo(item.href) ? "text-primary" : "text-zinc-500"
                        }
                      >
                        {item.icone}
                      </span>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="border-t border-border px-4 py-3 text-xs text-zinc-500">
          Ferramenta interna
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
        <Brand />
        <nav className="flex items-center gap-1 text-sm">
          {GRUPOS.flatMap((g) => g.itens).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-md px-2.5 py-1.5 transition-colors duration-200 ${
                ativo(item.href)
                  ? "bg-zinc-800/80 text-zinc-50"
                  : "text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </header>
    </>
  );
}
