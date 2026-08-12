"use client";

import { useActionState } from "react";
import {
  sugerirVideosAction,
  type SugerirState,
} from "@/actions/conteudo/sugerir";

const initial: SugerirState = { kind: "idle" };

const ETAPA_BADGE: Record<string, { label: string; classe: string }> = {
  topo: { label: "Topo", classe: "bg-sky-500/15 text-sky-300" },
  meio: { label: "Meio", classe: "bg-violet-500/15 text-violet-300" },
  fundo: { label: "Fundo", classe: "bg-emerald-500/15 text-emerald-300" },
};

export function SugerirForm() {
  const [state, action, pending] = useActionState(sugerirVideosAction, initial);

  return (
    <div>
      <form action={action} className="flex gap-2">
        <input
          name="tema"
          placeholder="Ex.: automação de atendimento pra clínicas"
          className="input-base flex-1"
        />
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Gerando..." : "Gerar ideias"}
        </button>
      </form>

      {state.kind === "erro" && (
        <p className="alert-erro mt-3">{state.mensagem}</p>
      )}

      {state.kind === "ok" && (
        <ul className="mt-6 space-y-4">
          {state.ideias.map((ideia, i) => {
            const etapa = ETAPA_BADGE[ideia.etapa];
            return (
              <li
                key={i}
                className="rounded-xl border border-border bg-card p-4 transition-colors duration-200 hover:border-zinc-600"
              >
                <div className="flex items-center gap-2">
                  <span
                    className={`badge ${etapa?.classe ?? "bg-zinc-500/15 text-zinc-300"}`}
                  >
                    {etapa?.label ?? ideia.etapa}
                  </span>
                  <span className="text-xs text-zinc-500">
                    {ideia.formato}
                  </span>
                </div>
                <h3 className="mt-2 font-semibold">{ideia.titulo}</h3>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-medium text-zinc-300">Atrai:</span>{" "}
                  {ideia.atrai}
                </p>
                <p className="mt-1 text-sm text-muted">
                  <span className="font-medium text-zinc-300">CTA:</span>{" "}
                  {ideia.cta}
                </p>
                {ideia.roteiro.length > 0 && (
                  <ol className="mt-2 list-decimal space-y-0.5 pl-5 text-sm text-zinc-400">
                    {ideia.roteiro.map((passo, j) => (
                      <li key={j}>{passo}</li>
                    ))}
                  </ol>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
