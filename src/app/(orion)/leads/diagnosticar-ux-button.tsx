"use client";

import { useActionState, useState } from "react";
import {
  diagnosticarUxAction,
  type DiagnosticarUxState,
} from "@/actions/leads/diagnosticarUx";
import type { AnaliseUx } from "@/lib/diagnostico-ux/analisarUx";
import type { Severidade } from "@prisma/client";

const initial: DiagnosticarUxState = { kind: "idle" };

const SEVERIDADE_BADGE: Record<Severidade, string> = {
  ALTA: "bg-red-500/15 text-red-300",
  MEDIA: "bg-amber-500/15 text-amber-300",
  BAIXA: "bg-zinc-500/15 text-zinc-300",
};

// AC7 — texto plano pronto pra colar no WhatsApp.
function formatarTexto(analise: AnaliseUx): string {
  const linhas = [
    `Diagnóstico do site — ${analise.resumo}`,
    "",
    "Problemas encontrados:",
    ...analise.problemas.map(
      (p, i) => `${i + 1}. [${p.severidade}] ${p.titulo} — ${p.detalhe}`,
    ),
  ];
  if (analise.pontos_positivos.length > 0) {
    linhas.push("", "Pontos positivos:");
    linhas.push(...analise.pontos_positivos.map((p) => `- ${p}`));
  }
  return linhas.join("\n");
}

export function DiagnosticarUxButton({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(diagnosticarUxAction, initial);
  const [copiado, setCopiado] = useState(false);

  async function copiar(analise: AnaliseUx) {
    await navigator.clipboard.writeText(formatarTexto(analise));
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  }

  return (
    <form action={action}>
      <input type="hidden" name="lead_id" value={leadId} />
      <button type="submit" disabled={pending} className="btn-ghost">
        {pending ? "Analisando..." : "Diagnóstico UX"}
      </button>

      {state.kind === "ok" && (
        <div className="mt-1 w-72 rounded-lg border border-border bg-zinc-900/70 p-3 text-left whitespace-normal">
          <p className="text-xs leading-relaxed text-zinc-300">
            {state.analise.resumo}
          </p>

          <ul className="mt-2 space-y-2">
            {state.analise.problemas.map((p, i) => (
              <li key={i} className="text-xs">
                <span className={`badge ${SEVERIDADE_BADGE[p.severidade]}`}>
                  {p.severidade}
                </span>
                <span className="ml-1.5 font-medium text-zinc-200">
                  {p.titulo}
                </span>
                <p className="mt-0.5 leading-relaxed text-zinc-400">
                  {p.detalhe}
                </p>
              </li>
            ))}
          </ul>

          {state.analise.pontos_positivos.length > 0 && (
            <ul className="mt-2 space-y-0.5">
              {state.analise.pontos_positivos.map((p, i) => (
                <li key={i} className="text-xs text-emerald-400">
                  + {p}
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            onClick={() => copiar(state.analise)}
            className="btn-ghost mt-2"
          >
            {copiado ? "Copiado!" : "Copiar"}
          </button>
        </div>
      )}

      {state.kind === "erro" && (
        <p className="mt-1 max-w-72 text-xs text-red-400">{state.mensagem}</p>
      )}
    </form>
  );
}
