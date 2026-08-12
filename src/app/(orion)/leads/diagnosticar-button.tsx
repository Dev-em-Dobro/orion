"use client";

import { useActionState } from "react";
import {
  diagnosticarLead,
  type DiagnosticarState,
} from "@/actions/leads/diagnosticar";

const initial: DiagnosticarState = { kind: "idle" };

export function DiagnosticarButton({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(diagnosticarLead, initial);

  return (
    <form action={action}>
      <input type="hidden" name="lead_id" value={leadId} />
      <button type="submit" disabled={pending} className="btn-ghost">
        {pending ? "Diagnosticando..." : "Diagnosticar"}
      </button>
      {state.kind === "ok" && (
        <p className="mt-1 max-w-48 text-xs text-emerald-400">{state.resumo}</p>
      )}
      {state.kind === "erro" && (
        <p className="mt-1 max-w-48 text-xs text-red-400">{state.mensagem}</p>
      )}
    </form>
  );
}
