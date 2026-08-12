"use client";

import { useActionState } from "react";
import { coletarLeads, type ColetarState } from "@/actions/leads/coletar";

const initial: ColetarState = { kind: "idle" };

export function ColetarForm() {
  const [state, action, pending] = useActionState(coletarLeads, initial);

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <h2 className="text-sm font-semibold tracking-wide text-zinc-300 uppercase">
        Coletar Leads
      </h2>
      <form action={action} className="mt-4 flex max-w-xl flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-300">Termo</span>
          <input
            name="termo"
            type="text"
            required
            placeholder="barbearia"
            className="input-base"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-zinc-300">
            Localização
          </span>
          <input
            name="localizacao"
            type="text"
            required
            placeholder="Curitiba PR"
            className="input-base"
          />
        </label>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Coletando..." : "Coletar"}
        </button>
      </form>

      {state.kind === "erro" && (
        <p className="alert-erro mt-4">{state.mensagem}</p>
      )}

      {state.kind === "ok" && (
        <p className="alert-ok mt-4">
          Busca concluída: {state.criados} Leads novos criados,{" "}
          {state.ignorados} ignorados (já existiam).
        </p>
      )}
    </div>
  );
}
