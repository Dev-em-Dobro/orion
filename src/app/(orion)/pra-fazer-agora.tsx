// F031 — as 5 cobranças mais atrasadas, na home.
// Spec: /specs/02-features/F031-central-de-tarefas.md

import Link from "next/link";
import { requireTenant } from "@/lib/db/scoped";
import { tarefasDoUsuario } from "@/lib/tarefas/consultar";
import { EXPLICACAO, TITULO } from "@/lib/tarefas/regras";

const NA_HOME = 5;

export async function PraFazerAgora() {
  const { userId } = await requireTenant();
  const tarefas = await tarefasDoUsuario(userId);
  // Só o que já venceu: a home não é lista de afazeres futuros.
  const vencidas = tarefas.filter((t) => t.faixa !== "hoje");

  if (vencidas.length === 0) return null;

  return (
    <section className="card border-amber-500/30 bg-amber-500/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="card-title text-amber-200">
          Pra fazer agora ({vencidas.length})
        </h2>
        {vencidas.length > NA_HOME && (
          <Link
            href="/tarefas"
            className="text-sm font-medium text-primary hover:underline"
          >
            ver todas
          </Link>
        )}
      </div>

      <ul className="mt-4 divide-y divide-amber-500/15">
        {vencidas.slice(0, NA_HOME).map((t) => (
          <li
            key={`${t.tipo}-${t.leadId ?? "geral"}`}
            className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm first:pt-0"
          >
            <span className="min-w-0">
              <span className="font-medium text-zinc-100">
                {TITULO[t.tipo]}
              </span>
              {t.leadNome && (
                <span className="text-zinc-300"> — {t.leadNome}</span>
              )}
              <span className="block text-xs text-zinc-400">
                {EXPLICACAO[t.tipo]}
              </span>
            </span>
            <Link
              href={
                t.leadId ? `/leads/${t.leadId}?aba=abordagem` : "/tarefas"
              }
              className="btn-ghost"
            >
              Resolver
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
