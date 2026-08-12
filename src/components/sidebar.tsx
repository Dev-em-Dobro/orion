"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { authClient } from "@/lib/auth/client";
import { ENTREGAVEIS_MENU } from "@/lib/entregaveis/catalogo";
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

const ICONES_ENTREGAVEIS: Record<string, React.ReactNode> = {
  "arsenal-sites": (
    <Icone
      d={
        <>
          <rect x="3" y="3" width="7" height="7" rx="1" />
          <rect x="14" y="3" width="7" height="7" rx="1" />
          <rect x="3" y="14" width="7" height="7" rx="1" />
          <rect x="14" y="14" width="7" height="7" rx="1" />
        </>
      }
    />
  ),
  prompts: (
    <Icone
      d={
        <>
          <path d="m12 3-1.9 5.8H4l4.9 3.6-1.9 5.8L12 14.6l4.9 3.8-1.9-5.8L20 8.8h-6.1L12 3z" />
        </>
      }
    />
  ),
  portfolio: (
    <Icone
      d={
        <>
          <rect x="2" y="7" width="20" height="14" rx="2" />
          <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
        </>
      }
    />
  ),
  contrato: (
    <Icone
      d={
        <>
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
          <path d="M8 13h8" />
          <path d="M8 17h6" />
        </>
      }
    />
  ),
  "scripts-venda": (
    <Icone
      d={
        <>
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          <path d="M8 9h8" />
          <path d="M8 13h5" />
        </>
      }
    />
  ),
  "setup-orion": (
    <Icone
      d={
        <>
          <circle cx="8" cy="15" r="4" />
          <path d="m10.5 10.5 6 6" />
          <path d="m18 6-3-3" />
          <path d="m15 9 3-3" />
        </>
      }
    />
  ),
  briefing: (
    <Icone
      d={
        <>
          <rect x="8" y="2" width="8" height="4" rx="1" />
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
          <path d="M12 11h4" />
          <path d="M12 16h4" />
          <path d="M8 11h.01" />
          <path d="M8 16h.01" />
        </>
      }
    />
  ),
  precificacao: (
    <Icone
      d={
        <>
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </>
      }
    />
  ),
};

function IconeCadeado() {
  return (
    <Icone
      d={
        <>
          <rect x="5" y="11" width="14" height="10" rx="2" />
          <path d="M8 11V8a4 4 0 0 1 8 0v3" />
        </>
      }
    />
  );
}

const GRUPO_MATERIAIS = "Materiais";
const ARENA_DOBRO_URL = "https://arena.devemdobro.com";

type NavItem = {
  href: string;
  label: string;
  icone?: React.ReactNode;
  externo?: boolean;
};

const GRUPOS_BASE: { titulo: string; itens: NavItem[] }[] = [
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
    titulo: "Arena",
    itens: [
      {
        href: ARENA_DOBRO_URL,
        label: "Arena Dobro",
        externo: true,
        icone: (
          <Icone
            d={
              <>
                <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5C7 4 9 7 12 7s5-3 7.5-3a2.5 2.5 0 0 1 0 5H18" />
                <path d="M12 7v13" />
                <path d="M8 21h8" />
                <path d="M6 9c0 3 2.5 5 6 5s6-2 6-5" />
              </>
            }
          />
        ),
      },
    ],
  },
  {
    titulo: "Materiais",
    itens: [
      {
        href: "/entregaveis",
        label: "Visão geral",
        icone: (
          <Icone
            d={
              <>
                <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H19a1 1 0 0 1 1 1v18a1 1 0 0 1-1 1H6.5a2.5 2.5 0 0 1 0-5H20" />
              </>
            }
          />
        ),
      },
      ...ENTREGAVEIS_MENU.map((item) => ({
        href: `/entregaveis/${item.slug}`,
        label: item.titulo,
        icone: ICONES_ENTREGAVEIS[item.slug],
      })),
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

function navClassName(
  compact: boolean | undefined,
  bloqueado: boolean | undefined,
  ativo: boolean,
  pending: boolean,
) {
  if (compact) {
    return `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors duration-200 ${
      bloqueado
        ? "cursor-pointer text-zinc-600 opacity-50"
        : ativo
          ? "bg-zinc-800/80 text-zinc-50"
          : "text-zinc-400 hover:text-zinc-200"
    } ${pending ? "opacity-80" : ""}`;
  }
  return `flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200 ${
    bloqueado
      ? "cursor-pointer text-zinc-600 opacity-50 hover:bg-zinc-800/20 hover:text-zinc-500"
      : ativo
        ? "bg-zinc-800/80 font-medium text-zinc-50"
        : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
  } ${pending ? "opacity-80" : ""}`;
}

function NavLink({
  href,
  label,
  icone,
  ativo,
  compact,
  bloqueado,
  externo,
  onNavigate,
}: {
  href: string;
  label: string;
  icone?: React.ReactNode;
  ativo: boolean;
  compact?: boolean;
  bloqueado?: boolean;
  externo?: boolean;
  onNavigate?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const destino = bloqueado ? "/ativar-acesso" : href;
  const className = navClassName(compact, bloqueado, ativo, pending);

  const conteudo = (
    <>
      {icone ? (
        <span
          className={
            bloqueado
              ? "text-zinc-600"
              : ativo || pending
                ? "text-primary"
                : "text-zinc-500"
          }
        >
          {icone}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {bloqueado ? (
        <span className="ml-auto text-zinc-600" aria-hidden>
          <IconeCadeado />
        </span>
      ) : null}
      {pending ? <NavSpinner /> : null}
    </>
  );

  if (externo && !bloqueado) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
        onClick={() => onNavigate?.()}
      >
        {conteudo}
      </a>
    );
  }

  return (
    <Link
      href={destino}
      aria-busy={pending || undefined}
      aria-disabled={bloqueado || undefined}
      title={bloqueado ? "Ative sua compra para acessar os materiais" : undefined}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
          return;
        }
        e.preventDefault();
        onNavigate?.();
        startTransition(() => {
          router.push(destino);
        });
      }}
      className={className}
    >
      {conteudo}
    </Link>
  );
}

function IconeMenu() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5"
    >
      <path d="M4 6h16" />
      <path d="M4 12h16" />
      <path d="M4 18h16" />
    </svg>
  );
}

function IconeFechar() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="h-5 w-5"
    >
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function NavGrupos({
  materiaisLiberados,
  ativo,
  onNavigate,
}: {
  materiaisLiberados: boolean;
  ativo: (href: string) => boolean;
  onNavigate?: () => void;
}) {
  return (
    <>
      {GRUPOS_BASE.map((grupo) => {
        const materiaisBloqueado =
          grupo.titulo === GRUPO_MATERIAIS && !materiaisLiberados;

        return (
          <div key={grupo.titulo}>
            <p
              className={`px-2 text-xs font-medium tracking-wider uppercase ${
                materiaisBloqueado ? "text-zinc-600" : "text-zinc-500"
              }`}
            >
              {grupo.titulo}
              {materiaisBloqueado ? (
                <span className="ml-1.5 inline-flex align-middle text-zinc-600">
                  <IconeCadeado />
                </span>
              ) : null}
            </p>
            <ul className="mt-2 space-y-1">
              {grupo.itens.map((item) => (
                <li key={item.href}>
                  <NavLink
                    href={item.href}
                    label={item.label}
                    icone={item.icone}
                    ativo={
                      !item.externo &&
                      !materiaisBloqueado &&
                      ativo(item.href)
                    }
                    bloqueado={materiaisBloqueado}
                    externo={item.externo}
                    onNavigate={onNavigate}
                  />
                </li>
              ))}
            </ul>
          </div>
        );
      })}
    </>
  );
}

export function Sidebar({ materiaisLiberados = false }: { materiaisLiberados?: boolean }) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);

  const ativo = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href === "/entregaveis") return pathname === "/entregaveis";
    return pathname.startsWith(href);
  };

  useEffect(() => {
    setMenuAberto(false);
  }, [pathname]);

  useEffect(() => {
    if (!menuAberto) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuAberto(false);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [menuAberto]);

  const fecharMenu = () => setMenuAberto(false);

  return (
    <>
      {/* Sidebar fixa (desktop) */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-60 flex-col border-r border-border bg-card/40 md:flex">
        <div className="flex h-14 items-center border-b border-border px-4">
          <Brand />
        </div>
        <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
          <NavGrupos
            materiaisLiberados={materiaisLiberados}
            ativo={ativo}
          />
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

      {/* Top bar (mobile) — brand + menu; links ficam no drawer */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
        <Brand />
        <button
          type="button"
          aria-label={menuAberto ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuAberto}
          onClick={() => setMenuAberto((v) => !v)}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-200 transition-colors hover:bg-zinc-800 hover:text-white"
        >
          {menuAberto ? <IconeFechar /> : <IconeMenu />}
        </button>
      </header>

      {menuAberto ? (
        <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button
            type="button"
            aria-label="Fechar menu"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={fecharMenu}
          />
          <div className="absolute inset-y-0 right-0 flex w-[min(20rem,100%)] flex-col border-l border-border bg-card shadow-2xl">
            <div className="flex h-14 items-center justify-between border-b border-border px-4">
              <p className="text-sm font-semibold text-zinc-100">Menu</p>
              <button
                type="button"
                aria-label="Fechar menu"
                onClick={fecharMenu}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-300 transition-colors hover:bg-zinc-800 hover:text-white"
              >
                <IconeFechar />
              </button>
            </div>
            <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-4">
              <NavGrupos
                materiaisLiberados={materiaisLiberados}
                ativo={ativo}
                onNavigate={fecharMenu}
              />
            </nav>
            <div className="space-y-2 border-t border-border px-4 py-3">
              <LogoutButton />
              <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-zinc-500">
                <Link
                  href="/termos"
                  className="hover:text-zinc-300"
                  onClick={fecharMenu}
                >
                  Termos
                </Link>
                <span aria-hidden>·</span>
                <Link
                  href="/privacidade"
                  className="hover:text-zinc-300"
                  onClick={fecharMenu}
                >
                  Privacidade
                </Link>
              </p>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
