// F043 — painel admin: allowlist/grant + alunos + trial.

import type { Metadata } from "next";
import Link from "next/link";
import {
  listAllowlistRecente,
  listAlunosAdmin,
  requireAdmin,
  type FiltroAlunosAdmin,
} from "@/lib/admin";
import { diasCortesiaPro, idProdutoCortesiaPro } from "@/lib/planos/trial";
import {
  estenderTrialAction,
  grantAcessoAction,
  grantAcessoBulkAction,
  grantTrialAction,
  revokeAcessoAction,
  revokeTrialAction,
} from "@/actions/admin/grant";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string; q?: string; filtro?: string }>;
};

function isFiltro(v: string | undefined): v is FiltroAlunosAdmin {
  return (
    v === "todos" ||
    v === "trial" ||
    v === "sem_login" ||
    v === "sem_ativacao"
  );
}

function fmtData(d: Date | null | undefined): string {
  if (!d) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  }).format(d);
}

export default async function AdminPage({ searchParams }: Props) {
  await requireAdmin();
  const sp = await searchParams;
  const tab = sp.tab === "alunos" ? "alunos" : "allowlist";
  const q = sp.q?.trim() || undefined;
  const filtro: FiltroAlunosAdmin = isFiltro(sp.filtro) ? sp.filtro : "todos";
  const trialDisponivel = Boolean(idProdutoCortesiaPro());
  const diasTrial = diasCortesiaPro();

  const [allowlist, alunos] = await Promise.all([
    tab === "allowlist" ? listAllowlistRecente(40) : Promise.resolve([]),
    tab === "alunos"
      ? listAlunosAdmin({ q, filtro, limit: 120 })
      : Promise.resolve([]),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <h1 className="text-2xl font-bold tracking-tight">Administração</h1>
      <p className="mt-1 text-sm text-muted">
        Grant de acesso e trial Pro. Quem tem entitlement sem conta ainda não
        logou; ativação = compra vinculada aos entregáveis.
      </p>

      <nav
        className="mt-6 flex gap-1 overflow-x-auto rounded-xl border border-border bg-card p-1"
        aria-label="Seções da administração"
      >
        {(
          [
            ["allowlist", "Allowlist"],
            ["alunos", "Alunos"],
          ] as const
        ).map(([id, label]) => {
          const ativo = tab === id;
          return (
            <Link
              key={id}
              href={`/admin?tab=${id}`}
              className={`shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors ${
                ativo
                  ? "bg-primary text-primary-foreground"
                  : "text-muted hover:bg-zinc-800/40 hover:text-zinc-200"
              }`}
              aria-current={ativo ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>

      {tab === "allowlist" ? (
        <section className="mt-8 space-y-8">
          <div>
            <h2 className="text-lg font-semibold">Liberar e-mail</h2>
            <p className="mt-1 text-sm text-muted">
              Grava entitlement de acesso. Conta existente é ativada na hora.
              {trialDisponivel
                ? ` Marque trial para +${diasTrial} dias de Pro.`
                : " Trial indisponível (HUBLA_PRODUCT_ID_PRO sem prefixo trial-pro-)."}
            </p>
            <form action={grantAcessoAction} className="mt-4 flex flex-wrap items-end gap-3">
              <label className="block min-w-[16rem] flex-1 text-sm">
                <span className="text-muted">E-mail</span>
                <input
                  name="email"
                  type="email"
                  required
                  className="input mt-1 w-full"
                  placeholder="aluno@email.com"
                />
              </label>
              {trialDisponivel ? (
                <label className="flex items-center gap-2 pb-2 text-sm">
                  <input name="comTrial" type="checkbox" className="rounded" />
                  + Trial Pro
                </label>
              ) : null}
              <button type="submit" className="btn-primary">
                Liberar
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Importação em massa</h2>
            <form action={grantAcessoBulkAction} className="mt-3 space-y-3">
              <textarea
                name="emails"
                rows={5}
                required
                className="input w-full font-mono text-sm"
                placeholder={"um@email.com\ndois@email.com"}
              />
              {trialDisponivel ? (
                <label className="flex items-center gap-2 text-sm">
                  <input name="comTrial" type="checkbox" className="rounded" />
                  + Trial Pro em todos
                </label>
              ) : null}
              <button type="submit" className="btn-primary">
                Liberar lista
              </button>
            </form>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Acessos recentes (grant)</h2>
            <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
              {allowlist.map((row) => (
                <li
                  key={`${row.email}-${row.product_id}`}
                  className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium">{row.email}</p>
                    <p className="text-xs text-muted">
                      desde {fmtData(row.granted_at)}
                    </p>
                  </div>
                  <form action={revokeAcessoAction}>
                    <input type="hidden" name="email" value={row.email} />
                    <button type="submit" className="btn-ghost text-xs text-amber-600">
                      Revogar acesso
                    </button>
                  </form>
                </li>
              ))}
              {allowlist.length === 0 ? (
                <li className="px-4 py-6 text-sm text-muted">
                  Nenhum entitlement ativo neste product de grant.
                </li>
              ) : null}
            </ul>
          </div>
        </section>
      ) : null}

      {tab === "alunos" ? (
        <section className="mt-8">
          <form className="flex flex-wrap items-end gap-3">
            <input type="hidden" name="tab" value="alunos" />
            <label className="block min-w-[14rem] flex-1 text-sm">
              <span className="text-muted">Buscar</span>
              <input
                name="q"
                defaultValue={q ?? ""}
                className="input mt-1 w-full"
                placeholder="e-mail"
              />
            </label>
            <label className="block text-sm">
              <span className="text-muted">Filtro</span>
              <select
                name="filtro"
                defaultValue={filtro}
                className="input mt-1"
              >
                <option value="todos">Todos</option>
                <option value="trial">Com trial</option>
                <option value="sem_login">Sem login</option>
                <option value="sem_ativacao">Sem ativação</option>
              </select>
            </label>
            <button type="submit" className="btn-primary">
              Filtrar
            </button>
          </form>

          <ul className="mt-6 divide-y divide-border rounded-xl border border-border">
            {alunos.map((a) => (
              <li key={a.email} className="space-y-3 px-4 py-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {a.name ? `${a.name} · ` : null}
                      {a.email}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      Conta: {a.temConta ? "sim" : "não"} · Ativou:{" "}
                      {a.ativadoEm ? fmtData(a.ativadoEm) : "não"} · Login:{" "}
                      {fmtData(a.ultimoLoginEm)} · Plano: {a.plano}
                      {a.trialAtivo
                        ? ` · Trial até ${a.trialExpiresIso ?? "—"}`
                        : ""}
                      {a.acessoAtivo ? " · acesso OK" : " · sem acesso"}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {a.acessoAtivo ? (
                    <form action={revokeAcessoAction}>
                      <input type="hidden" name="email" value={a.email} />
                      <button type="submit" className="btn-ghost text-xs">
                        Revogar acesso
                      </button>
                    </form>
                  ) : (
                    <form action={grantAcessoAction}>
                      <input type="hidden" name="email" value={a.email} />
                      <button type="submit" className="btn-primary text-xs">
                        Liberar acesso
                      </button>
                    </form>
                  )}
                  {trialDisponivel ? (
                    a.trialAtivo ? (
                      <>
                        <form action={estenderTrialAction} className="flex items-center gap-1">
                          <input type="hidden" name="email" value={a.email} />
                          <input type="hidden" name="dias" value={String(diasTrial)} />
                          <button type="submit" className="btn-outline text-xs">
                            Estender +{diasTrial}d
                          </button>
                        </form>
                        <form action={revokeTrialAction}>
                          <input type="hidden" name="email" value={a.email} />
                          <button type="submit" className="btn-ghost text-xs text-amber-600">
                            Revogar trial
                          </button>
                        </form>
                      </>
                    ) : (
                      <form action={grantTrialAction}>
                        <input type="hidden" name="email" value={a.email} />
                        <button type="submit" className="btn-outline text-xs">
                          Conceder trial
                        </button>
                      </form>
                    )
                  ) : null}
                </div>
              </li>
            ))}
            {alunos.length === 0 ? (
              <li className="px-4 py-6 text-sm text-muted">
                Nenhum aluno neste filtro.
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
