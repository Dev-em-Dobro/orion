"use client";

import { useActionState } from "react";
import { priorizarLead, type PriorizarState } from "@/actions/leads/priorizar";
import { AjudaScore } from "./ajuda-score";

const initial: PriorizarState = { kind: "idle" };

export function PriorizarButton({ leadId }: { leadId: string }) {
  const [state, action, pending] = useActionState(priorizarLead, initial);

  return (
    <form action={action}>
      <input type="hidden" name="lead_id" value={leadId} />
      <button type="submit" disabled={pending} className="btn-ghost">
        {pending ? "Priorizando..." : "Priorizar"}
      </button>
      {state.kind === "ok" && (
        <span className="mt-1 flex max-w-56 items-start gap-1.5">
          <p className="text-xs text-emerald-400">{state.resumo}</p>
          <AjudaScore foco="completo" colocacao="acima-esquerda" />
        </span>
      )}
      {state.kind === "erro" && (
        <p className="mt-1 max-w-48 text-xs text-red-400">{state.mensagem}</p>
      )}
    </form>
  );
}
