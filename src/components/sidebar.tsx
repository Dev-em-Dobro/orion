"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth/client";
import { SKILLS_MENU } from "@/lib/skills/catalogo";
import {
  definicao,
  LABEL_RECURSO,
  planoQueAbre,
  precoFormatado,
  temRecurso,
  type Plano,
  type Recurso,
} from "@/lib/planos/catalogo";
import { NOME_PRODUTO_PARTES } from "@/lib/produto";
import { Icone, IconeCadeado } from "@/components/icones";

type NavItem = {
  href: string;
  label: string;
  icone?: React.ReactNode;
  externo?: boolean;
  /** F031 — contador de cobranças vencidas. */
  badge?: number;
  /** F035 — recurso de plano que o item exige. Sem ele: cadeado + /planos. */
  recurso?: Recurso;
};

function grupos(tarefasVencidas: number): { titulo: string; itens: NavItem[] }[] {
  return GRUPOS_BASE.map((g) => ({
    ...g,
    itens: g.itens.map((i) =>
      i.href === "/tarefas" ? { ...i, badge: tarefasVencidas } : i,
    ),
  }));
}

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
      {
        href: "/agente",
        label: "Agente",
        recurso: "agente",
        icone: (
          <Icone
            d={
              <>
                <rect x="4" y="7" width="16" height="12" rx="3" />
                <path d="M12 3v4M9 13h.01M15 13h.01M9 16h6" />
              </>
            }
          />
        ),
      },
      {
        href: "/funil",
        label: "Funil",
        recurso: "kanban",
        icone: (
          <Icone
            d={
              <>
                <rect x="3" y="4" width="5" height="16" rx="1" />
                <rect x="10" y="4" width="5" height="11" rx="1" />
                <rect x="17" y="4" width="4" height="7" rx="1" />
              </>
            }
          />
        ),
      },
      {
        href: "/tarefas",
        label: "Tarefas",
        recurso: "tarefas",
        icone: (
          <Icone
            d={
              <>
                <path d="M9 11l3 3 8-8" />
                <path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9" />
              </>
            }
          />
        ),
      },
      {
        href: "/ranking",
        label: "Ranking",
        icone: (
          <Icone
            d={
              <>
                <path d="M8 21h8M12 17v4" />
                <path d="M7 4h10v5a5 5 0 0 1-10 0z" />
                <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
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
  // F020/F032 — os grupos "Arena" (link externo) e "Materiais" saíram em
  // 2026-08-11: o menu é do trabalho de prospecção. `/entregaveis` continua
  // servindo, gateado por compra, só não parte daqui.
  ...(SKILLS_MENU.length > 0
    ? [
        {
          // F030 — o grupo só existe quando há skill publicada: menu com link
          // morto é pior que menu sem o item.
          titulo: "Skills",
          itens: [
            {
              href: "/skills",
              label: "Visão geral",
              icone: (
                <Icone
                  d={
                    <>
                      <path d="m12 3-1.9 5.8H4l4.9 3.6-1.9 5.8L12 14.6l4.9 3.8-1.9-5.8L20 8.8h-6.1L12 3z" />
                    </>
                  }
                />
              ),
            },
            ...SKILLS_MENU.map((skill) => ({
              href: `/skills/${skill.slug}`,
              label: skill.titulo,
            })),
          ],
        },
      ]
    : []),
  {
    titulo: "Conta",
    itens: [
      {
        href: "/planos",
        label: "Planos",
        icone: (
          <Icone
            d={
              <>
                <path d="M3 10h18M7 15h4" />
                <rect x="3" y="5" width="18" height="14" rx="2" />
              </>
            }
          />
        ),
      },
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

// O spinner por item saiu em 2026-08-13. Cada `NavLink` tinha o **próprio**
// `useTransition`, e o pending de um não zerava quando outro começava: clicar
// em três menus seguidos deixava três spinners girando ao mesmo tempo, nenhum
// deles dizendo o que estava carregando. O feedback agora é o `loading.tsx` de
// cada rota — o esqueleto da página que está chegando.

// Item bloqueado era `text-muted opacity-50` — 2,3:1 antes da opacidade, e
// ~1,6:1 depois dela. Ilegível, e a F035 quer o contrário: o recurso pago tem
// que ser **visto** pra dar vontade de assinar. Agora usa `text-muted` (7,7:1),
// e quem diz "fechado" é o cadeado, não o apagamento.
function navClassName(
  compact: boolean | undefined,
  bloqueado: boolean | undefined,
  ativo: boolean,
) {
  if (compact) {
    return `inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors duration-200 ${
      bloqueado
        ? "cursor-pointer text-muted hover:text-zinc-200"
        : ativo
          ? "bg-zinc-800/80 text-zinc-50"
          : "text-zinc-400 hover:text-zinc-200"
    }`;
  }
  return `flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors duration-200 ${
    bloqueado
      ? "cursor-pointer text-muted hover:bg-zinc-800/40 hover:text-zinc-200"
      : ativo
        ? "bg-zinc-800/80 font-medium text-zinc-50"
        : "text-zinc-400 hover:bg-zinc-800/40 hover:text-zinc-200"
  }`;
}

/** Modal do item fechado: o que é, qual plano abre, e o caminho pra assinar. */
function ModalBloqueado({
  recurso,
  onFechar,
}: {
  recurso: Recurso;
  onFechar: () => void;
}) {
  const plano = planoQueAbre(recurso);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onFechar();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onFechar}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-bloqueado"
        className="relative w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-2xl"
      >
        <div className="flex items-center gap-3">
          <span className="text-primary">
            <IconeCadeado />
          </span>
          <h2
            id="titulo-bloqueado"
            className="text-base font-semibold text-zinc-100"
          >
            {LABEL_RECURSO[recurso]}
          </h2>
        </div>

        <p className="mt-3 text-sm text-muted">
          {plano
            ? `Disponível no plano ${definicao(plano).nome} — ${precoFormatado(plano)}.`
            : "Disponível nos planos pagos."}
        </p>

        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={`/planos?recurso=${recurso}`}
            onClick={onFechar}
            className="btn-primary"
          >
            Ver planos
          </Link>
          <button type="button" onClick={onFechar} className="btn-ghost">
            Agora não
          </button>
        </div>
      </div>
    </div>
  );
}

function NavLink({
  href,
  label,
  icone,
  ativo,
  compact,
  bloqueado,
  externo,
  badge,
  onBloqueado,
  onNavigate,
}: {
  href: string;
  label: string;
  icone?: React.ReactNode;
  ativo: boolean;
  compact?: boolean;
  bloqueado?: boolean;
  externo?: boolean;
  badge?: number;
  /** Clique num item fechado abre o modal em vez de navegar. */
  onBloqueado?: () => void;
  onNavigate?: () => void;
}) {
  const className = navClassName(compact, bloqueado, ativo);

  const conteudo = (
    <>
      {icone ? (
        <span
          className={
            bloqueado ? "text-muted" : ativo ? "text-primary" : "text-muted"
          }
        >
          {icone}
        </span>
      ) : null}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {badge ? (
        <span className="ml-auto rounded-full bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
          {badge}
        </span>
      ) : null}
      {bloqueado ? (
        <span className="ml-auto text-muted" aria-hidden>
          <IconeCadeado />
        </span>
      ) : null}
    </>
  );

  // Item fechado é `<button>`, não `<Link>`: ele não leva a lugar nenhum, abre
  // um diálogo. Link que não navega confunde teclado e leitor de tela.
  if (bloqueado) {
    return (
      <button
        type="button"
        onClick={() => onBloqueado?.()}
        aria-haspopup="dialog"
        className={`${className} w-full text-left`}
      >
        {conteudo}
      </button>
    );
  }

  if (externo) {
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

  // `<Link>` puro: é o que faz o App Router mostrar o `loading.tsx` da rota
  // destino. Com `router.push` dentro de `startTransition`, o React segurava a
  // tela antiga e o esqueleto não aparecia.
  return (
    <Link href={href} onClick={() => onNavigate?.()} className={className}>
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
  tarefasVencidas,
  plano,
  ativo,
  onBloqueado,
  onNavigate,
}: {
  tarefasVencidas: number;
  /** F035 — decide o cadeado dos itens de plano pago. */
  plano: Plano;
  ativo: (href: string) => boolean;
  onBloqueado: (recurso: Recurso) => void;
  onNavigate?: () => void;
}) {
  return (
    <>
      {grupos(tarefasVencidas).map((grupo) => {
        return (
          <div key={grupo.titulo}>
            <p className="px-2 text-xs font-medium tracking-wider text-muted uppercase">
              {grupo.titulo}
            </p>
            <ul className="mt-2 space-y-1">
              {grupo.itens.map((item) => {
                // F035 — o item **não some**: fica visível com cadeado e leva
                // a /planos. Ver é o que dá vontade de assinar.
                const bloqueado = Boolean(
                  item.recurso && !temRecurso(plano, item.recurso),
                );
                return (
                  <li key={item.href}>
                    <NavLink
                      href={item.href}
                      label={item.label}
                      icone={item.icone}
                      ativo={!item.externo && !bloqueado && ativo(item.href)}
                      bloqueado={bloqueado}
                      externo={item.externo}
                      badge={bloqueado ? undefined : item.badge}
                      onBloqueado={
                        item.recurso ? () => onBloqueado(item.recurso!) : undefined
                      }
                      onNavigate={onNavigate}
                    />
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </>
  );
}

export function Sidebar({
  tarefasVencidas = 0,
  plano = "free",
  medidor,
}: {
  /** F031 — cobranças vencidas, no badge do item Tarefas. */
  tarefasVencidas?: number;
  /** F035 — plano do aluno, pro cadeado dos itens pagos. */
  plano?: Plano;
  /** F035 — medidor de uso no cabeçalho do mobile (no desktop ele vive na
   *  topbar do `AppShellClient`). */
  medidor?: React.ReactNode;
}) {
  const pathname = usePathname();
  const [menuAberto, setMenuAberto] = useState(false);
  // Recurso do item fechado que o aluno clicou — abre o modal da F035.
  const [bloqueio, setBloqueio] = useState<Recurso | null>(null);

  const ativo = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  useEffect(() => {
    setMenuAberto(false);
    setBloqueio(null);
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
            tarefasVencidas={tarefasVencidas}
            plano={plano}
            ativo={ativo}
            onBloqueado={setBloqueio}
          />
        </nav>
        <div className="space-y-2 border-t border-border px-4 py-3">
          <LogoutButton />
          <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
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

      {/* Top bar (mobile) — brand + medidor + menu; links ficam no drawer */}
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-2 border-b border-border bg-background/95 px-4 backdrop-blur md:hidden">
        <Brand />
        {medidor}
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
                tarefasVencidas={tarefasVencidas}
                plano={plano}
                ativo={ativo}
                onBloqueado={setBloqueio}
                onNavigate={fecharMenu}
              />
            </nav>
            <div className="space-y-2 border-t border-border px-4 py-3">
              <LogoutButton />
              <p className="flex flex-wrap gap-x-2 gap-y-1 text-xs text-muted">
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

      {bloqueio && (
        <ModalBloqueado recurso={bloqueio} onFechar={() => setBloqueio(null)} />
      )}
    </>
  );
}
