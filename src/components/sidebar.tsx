"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTransition } from "react";
import { authClient } from "@/lib/auth/client";
import { NOME_PRODUTO_PARTES } from "@/lib/produto";

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
  {
    titulo: "Conta",
    itens: [
      {
        href: "/configuracao",
        label: "Configuração",
        icone: (
          <Icone
            d={
              <>
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
                <circle cx="12" cy="12" r="3" />
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
      {NOME_PRODUTO_PARTES.primaria}&nbsp;
      <span className="text-primary">{NOME_PRODUTO_PARTES.secundaria}</span>
    </Link>
  );
}

function LogoutButton({ className }: { className?: string }) {
  const router = useRouter();

  async function sair() {
    await authClient.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={() => void sair()}
      className={className ?? "btn-ghost w-full justify-center"}
    >
      Sair
    </button>
  );
}

function NavSpinner() {
  return (
    <span
      className="ml-auto inline-block h-3.5 w-3.5 shrink-0 animate-spin rounded-full border-2 border-zinc-500 border-t-primary"
      aria-hidden
    />
  );
}

function NavLink({
  href,
  label,
  icone,
  ativo,
  compact,
}: {
  href: string;
  label: string;
  icone?: React.ReactNode;
  ativo: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <Link
      href={href}
      aria-busy={pending || undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
          return;
        }
        e.preventDefault();
        startTransition(() => {
          router.push(href);
        });
      }}
      className={
        compact
          ? `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors duration-200 ${
              ativo
                ? "bg-zinc-800/80 text-zinc-50"
                : "text-zinc-400 hover:text-zinc-200"
            } ${pending ? "opacity-80" : ""}`
          : `flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200 ${
              ativo
                ? "bg-zinc-800/80 font-medium text-zinc-50"
                : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
            } ${pending ? "opacity-80" : ""}`
      }
    >
      {icone ? (
        <span className={ativo || pending ? "text-primary" : "text-zinc-500"}>
          {icone}
        </span>
      ) : null}
      {label}
      {pending ? <NavSpinner /> : null}
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
                    <NavLink
                      href={item.href}
                      label={item.label}
                      icone={item.icone}
                      ativo={ativo(item.href)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
        <div className="space-y-2 border-t border-border px-4 py-3">
          <LogoutButton />
          <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-zinc-500">
            <Link href="/termos" className="hover:text-zinc-300">
              Termos
            </Link>
            <span aria-hidden>·</span>
            <Link href="/privacidade" className="hover:text-zinc-300">
              Privacidade
            </Link>
          </p>
        </div>
      </aside>

      {/* Top bar (mobile) */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/80 px-4 backdrop-blur md:hidden">
        <Brand />
        <div className="flex items-center gap-1 text-sm">
          <nav className="flex items-center gap-1 overflow-x-auto">
            {GRUPOS.flatMap((g) => g.itens).map((item) => (
              <NavLink
                key={item.href}
                href={item.href}
                label={item.label}
                ativo={ativo(item.href)}
                compact
              />
            ))}
          </nav>
          <LogoutButton className="btn-ghost shrink-0" />
        </div>
      </header>
    </>
  );
}
