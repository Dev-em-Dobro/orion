"use client";

// F024 — exclusão definitiva dos descartados.
// Spec: /specs/02-features/F024-estado-do-lead-reversivel.md

import { useActionState } from "react";
import {
  excluirDescartados,
  type ExcluirDescartadosState,
} from "@/actions/leads/excluirDescartados";

const initial: ExcluirDescartadosState = { kind: "idle" };

/**
 * A confirmação é digitar a quantidade. É atrito de propósito: esta é a única
 * ação da F024 que não tem volta.
 */
export function ExcluirDescartadosForm({ quantidade }: { quantidade: number }) {
  const [state, action, pending] = useActionState(excluirDescartados, initial);

  if (state.kind === "ok") {
    return (
      <p className="text-xs text-zinc-400">
        {state.excluidos} Lead(s) excluído(s) definitivamente.
      </p>
    );
  }

  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <label className="text-xs text-muted">
        Excluir de vez? Digite <strong className="text-zinc-300">{quantidade}</strong> para confirmar
      </label>
      <input
        name="confirmacao"
        inputMode="numeric"
        placeholder={String(quantidade)}
        className="w-20 rounded-lg border border-border bg-zinc-900/70 px-3 py-1.5 text-xs text-zinc-100"
      />
      <button
        type="submit"
        disabled={pending}
        className="btn-ghost text-red-300 hover:text-red-200"
      >
        {pending ? "Excluindo…" : "Excluir descartados"}
      </button>
      {state.kind === "erro" && (
        <p className="w-full text-xs text-red-400">{state.mensagem}</p>
      )}
    </form>
  );
}
