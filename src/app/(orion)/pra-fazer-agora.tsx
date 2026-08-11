// F031 — as 5 cobranças mais atrasadas, na home.
// Spec: /specs/02-features/F031-central-de-tarefas.md

import Link from "next/link";
import { tarefasDoUsuario } from "@/lib/tarefas/consultar";
import { EXPLICACAO, TITULO } from "@/lib/tarefas/regras";

const NA_HOME = 5;

export async function PraFazerAgora() {
  const tarefas = await tarefasDoUsuario();
  // Só o que já venceu: a home não é lista de afazeres futuros.
  const vencidas = tarefas.filter((t) => t.faixa !== "hoje");

  if (vencidas.length === 0) return null;

  return (
    <section className="card border-amber-500/30 bg-amber-500/5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold tracking-wide text-amber-300 uppercase">
          Pra fazer agora ({vencidas.length})
        </h2>
        {vencidas.length > NA_HOME && (
          <Link href="/tarefas" className="text-xs text-primary hover:underline">
            ver todas
          </Link>
        )}
      </div>

      <ul className="mt-3 space-y-2">
        {vencidas.slice(0, NA_HOME).map((t) => (
          <li
            key={`${t.tipo}-${t.leadId ?? "geral"}`}
            className="flex flex-wrap items-center justify-between gap-2 text-sm"
          >
            <span className="min-w-0">
              <span className="font-medium text-zinc-100">
                {TITULO[t.tipo]}
              </span>
              {t.leadNome && (
                <span className="text-zinc-400"> — {t.leadNome}</span>
              )}
              <span className="block text-xs text-zinc-500">
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
